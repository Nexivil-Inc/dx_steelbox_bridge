import { IntersectionPointOnSpline, MainPointGenerator, StPointToNormalOffset, StPointToParallel } from '@nexivil/package-modules'

export function GridInputAutoGen(girderLayout, girderBaseInfo) {
    let end = girderBaseInfo.end;         //단부 바닥판 두께
    let support = girderBaseInfo.support; //연속지점부 바닥판두께
    let common = girderBaseInfo.common;
    let auto = girderBaseInfo.auto;
    let sShape = girderBaseInfo.SEShape.start;
    let eShape = girderBaseInfo.SEShape.end;
    const SEShape = {
        "start": { A: sShape.A, D: sShape.B, F: sShape.C, G: sShape.D, isStraight: true, endSlabH: end.SlabH, slabH: support.SlabH },
        "end": { A: eShape.A, D: eShape.B, F: eShape.C, G: eShape.D, isStraight: true, endSlabH: end.SlabH, slabH: support.SlabH }
    }
    let Height = GirderHeightAutoGen(girderLayout, end, support, common, SEShape)
    let flange = flangeAutoGen(girderLayout, end, support, common, auto)
    let joint = FactoryJointAutoGen(girderLayout, auto)
    let stiff = StiffPointAutoGen(girderLayout, end, support, auto, SEShape)
    // slabLayout = [구간명, 슬래브두께, 켄틸레버슬래브두께,  ]
    let slabLayout = [["CRK0", end.SlabH, end.SlabEndH, -1 * common.SlabLeft, common.SlabRight, 0],
    ["CRK2", end.SlabH, end.SlabEndH, -1 * common.SlabLeft, common.SlabRight, 0],
    ["CRK3", support.SlabH, support.SlabEndH, -1 * common.SlabLeft, common.SlabRight, girderBaseInfo.support.HaunchH],
    ["CRK4", support.SlabH, support.SlabEndH, -1 * common.SlabLeft, common.SlabRight, girderBaseInfo.support.HaunchH],
    ["CRK5", end.SlabH, end.SlabEndH, -1 * common.SlabLeft, common.SlabRight, 0],
    ["CRK7", end.SlabH, end.SlabEndH, -1 * common.SlabLeft, common.SlabRight, 0]];

    return {
        range: {
            H: Height.hLayout, TW: flange.ufwLayout, BW: flange.lfwLayout,
            TF: joint.TFLayout, BF: joint.BFLayout, WF: joint.WFLayout,
            TR: flange.uRib, BR: flange.lRib, LC: stiff.lConcLayout
        },
        point: { D: stiff.diaLayout, V: stiff.vStiffLayout, SP: stiff.SpliceLayout },
        slabLayout,
        xbeamLayout: stiff.xbeamLayout
    } //종리브와 같은 불연속한 부재에 대한 내용 추가필요
} //각 그리드 포인트 인풋 정보에 대한 리스트 오브 리스트로 동일하게 통일, 거더별 리스트 조합

export function GridPointBasic(girderLayout, SEShape) {
    let alignment = girderLayout.alignment
    let nameToPointDict = {};
    const girderNumber = girderLayout.girderSplines.length
    let pointName = "";
    let offset = 0;
    for (let k = 0; k < 8; k++) { //단부종점에 대한 그리드포인트
      switch (k) {
        case 0: offset = SEShape.start.A; break;
        case 1: offset = SEShape.start.A + SEShape.start.D; break;
        case 2: offset = SEShape.start.A + SEShape.start.D + SEShape.start.F; break;
        case 3: offset = SEShape.start.A + SEShape.start.D + SEShape.start.F + SEShape.start.G; break;
        case 4: offset = -(SEShape.end.A + SEShape.end.D + SEShape.end.F + SEShape.end.G); break;
        case 5: offset = -(SEShape.end.A + SEShape.end.D + SEShape.end.F); break;
        case 6: offset = -(SEShape.end.A + SEShape.end.D); break;
        case 7: offset = -(SEShape.end.A); break;
      }
      let mainPoint = k < 4 ? girderLayout.startPoint : girderLayout.endPoint;
      let centerPoint = StPointToParallel(mainPoint, offset, alignment)
      for (let i = 0; i < girderNumber; i++) {
        pointName = "G" + (i + 1) + "K" + k;
        nameToPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], centerPoint, alignment, false)
      }
      nameToPointDict["CRK" + k] = centerPoint;
    }
    for (let k in girderLayout.gridKeyPoint) { //지점에 대한 그리드포인트
      let centerPoint = girderLayout.gridKeyPoint[k];
      for (let i = 0; i < girderNumber; i++) {
        pointName = "G" + (i + 1) + k.slice(2); //substr(2);
        nameToPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], centerPoint, alignment, false)
      }
      nameToPointDict[k] = centerPoint;
    }
  
    return nameToPointDict
  }
  
function optimizeSplice(spList, totalSp, segMaxLength, firstMaxLength, lastMaxLength) {
    let firstIndex = 0;
    let lastIndex = 0;
    for (let sp = 0; sp<spList.length; sp++){
        if ((spList[sp]) <= firstMaxLength){
            firstIndex = sp
        }
        if (totalSp - spList[spList.length -1 - sp] <= lastMaxLength){
            lastIndex = spList.length -1 - sp;
        }
    }

    let m = Math.ceil((spList[lastIndex] - spList[firstIndex]) / segMaxLength)
    let k = (spList[lastIndex] - spList[firstIndex]) / m
    let optIndex = [firstIndex];
    let dummy1 = spList[firstIndex]
    let newSp = firstIndex;
    for (let ii = 0; ii < m - 1; ii++) {
        let optLength = Infinity;
        dummy1 = spList[newSp]
        let startIndex = newSp
        for (let sp = startIndex + 1; sp < lastIndex; sp++) {
            if (Math.abs(spList[sp] - dummy1 - k) < optLength) {
                optLength = Math.abs(spList[sp] - dummy1 - k);
                newSp = sp
            }
        }
        optIndex.push(newSp)
    }
    optIndex.push(lastIndex);
    return optIndex
}



export function StiffPointAutoGen(girderLayout, end, support, auto, SEShape) {
    let girderNum = girderLayout.girderCount;
    let supportNum = girderLayout.supportCount;
    let diaSpacing = auto.diaSpacing; //공통변수
    let segMaxLength = auto.segMaxLength;
    let lConcThickness = support.LCONC;
    // let endSpliceSegMax = 9000;
    // let centerSpliceSegMax = 12000;
    // let supportSpliceSegMax = 10000;
    let diaLayout = [];
    let vStiffLayout = [];
    let SpliceLayout = [];
    let lConcLayout = [];
    let gridPointDict = GridPointBasic(girderLayout, SEShape);

    for (let i = 0; i < girderNum; i++) {
        let diaSub = [];
        let vStiffSub = [];
        let spliceSub = [];
        let lConcSub = [];
        let skew1 = 90;
        let skew2 = 90;
        for (let j = 1; j < supportNum - 2; j++) {
            let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + (j).toFixed(0);
            let ptName1 = "G" + (i + 1).toFixed(0) + "S" + (j).toFixed(0);
            let ptName2 = "G" + (i + 1).toFixed(0) + "S" + (j + 1).toFixed(0);
            let point1 = gridPointDict[ptName1];
            let point2 = gridPointDict[ptName2];
            skew1 = point1.skew
            skew2 = point2.skew
            let sLength = point2.mainStation - point1.mainStation;
            let diaNum = Math.floor(sLength / diaSpacing);
            let remain = sLength % diaSpacing;
            let diaList = [];
            let vStiffList = [];
            let spList = [];
            let sp = 0;
            let totalSp = 0;
            let a = 0;
            let n = 2; //항상 짝수이어야함
            if (j === 1) {
                while (totalSp < sLength) {
                    diaList.push(totalSp);
                    if (a < n && remain > 0) {
                        sp = (remain + (n - 1) * diaSpacing) / n;
                    } else {
                        sp = diaSpacing;
                    }
                    vStiffList.push(totalSp + sp / 2);
                    spList.push(totalSp + sp / 4, totalSp + sp * 3 / 4);
                    totalSp += sp;
                    a++
                    if (a > 100) { break; }
                }
            } else if (j > 1 && j < supportNum - 3) {
                while (totalSp < sLength) {
                    diaList.push(totalSp);
                    if (diaNum % 2 === 0) { //짝수분할
                        if (a >= (diaNum - n) / 2 && a <= (diaNum + n) / 2 && remain > 0) {
                            sp = (remain + (n) * diaSpacing) / (n + 1);
                        } else {
                            sp = diaSpacing;
                        }
                    } else { // 홀수분할
                        if (a >= (diaNum - n) / 2 && a <= (diaNum + n) / 2 && remain > 0) {
                            sp = (remain + (n - 1) * diaSpacing) / (n);
                        } else {
                            sp = diaSpacing;
                        }
                    }
                    vStiffList.push(totalSp + sp / 2);
                    spList.push(totalSp + sp / 4, totalSp + sp * 3 / 4);
                    totalSp += sp;
                    a++
                    if (a > 100) { break; }
                }
            } else if (j === supportNum - 3) {
                while (totalSp < sLength) {
                    diaList.push(totalSp);
                    if (a > diaNum - 2 && remain > 0) {
                        sp = (remain + (n - 1) * diaSpacing) / n
                    } else {
                        sp = diaSpacing
                    }
                    vStiffList.push(totalSp + sp / 2);
                    spList.push(totalSp + sp / 4, totalSp + sp * 3 / 4);
                    totalSp += sp
                    a++
                    if (a > 100) { break; }
                }
            }
            let spNum = 0;
            let sIndex = 0;
            let eIndex = 0;
            if (j === 1) {
                sIndex = 3;
                eIndex = 2;
            } else if (j > 1 && j < supportNum - 3) {
                sIndex = 1;
                eIndex = 2;
            } else if (j === supportNum - 3) {
                sIndex = 1;
                eIndex = 4;
            }
            spNum = spList.length - sIndex - eIndex
            if (j === 1) {
                for (let d = 0; d < diaList.length; d++) {
                    if (d === 0 || d === 1) {
                        if (end.Box) {
                            if (d === 0) {
                                diaSub.push([benchMarkName, diaList[d], "박스부-지점", skew1])
                            } else {
                                diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90])
                            }
                        } else {
                            diaSub.push([benchMarkName, diaList[d], "플레이트-상-볼트", 90])
                        }
                    } else if (d === 2) {
                        if (end.Box) {
                            diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90])
                        } else {
                            diaSub.push([benchMarkName, diaList[d], "플레이트-중-볼트", 90])
                        }
                    } else if (d > 2 && d < diaList.length - 3) {
                        if (end.Box && d === 3) {
                            diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90])
                        } else {
                            diaSub.push([benchMarkName, diaList[d], "플레이트-중", 90])
                        }
                    } else if (d === diaList.length - 3) {
                        diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90])
                    } else if (d === diaList.length - 2 || d === diaList.length - 1) {
                        diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90])
                    }
                }
                for (let v = 0; v < vStiffList.length; v++) {
                    if (v < 2) {
                        if (end.Box) {
                            vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                        } else {
                            vStiffSub.push([benchMarkName, vStiffList[v], "수직보강1"]);
                        }

                    } else if (v < diaList.length - 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "수직보강2"]);
                    } else {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    }
                }

            } else if (j > 1 && j < supportNum - 3) {
                for (let d = 0; d < diaList.length; d++) {
                    if (d === 0) {
                        diaSub.push([benchMarkName, diaList[d], "박스부-지점", 90])
                    } else if (d === 1 || d === 2) {
                        diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90])
                    } else if (d === 3) {
                        diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90])
                    }
                    else if (d > 3 && d < diaList.length - 3) {
                        diaSub.push([benchMarkName, diaList[d], "플레이트-중", 90])
                    } else if (d === diaList.length - 3) {
                        diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90])
                    } else if (d === diaList.length - 2 || d === diaList.length - 1) {
                        diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90])
                    }
                }
                for (let v = 0; v < vStiffList.length; v++) {
                    if (v < 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    } else if (v < diaList.length - 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "수직보강2"]);
                    } else {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    }
                }
            } else if (j === supportNum - 3) {
                for (let d = 0; d < diaList.length; d++) {
                    if (d === 0) {
                        diaSub.push([benchMarkName, diaList[d], "박스부-지점", 90])
                    } else if (d === 1 || d === 2) {
                        diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90])
                    } else if (d === 3) {
                        diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90])
                    }
                    else if (d > 3 && d < diaList.length - 3) {
                        diaSub.push([benchMarkName, diaList[d], "플레이트-중", 90])
                    } else if (d === diaList.length - 3) {
                        if (end.Box) {
                            diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90])
                        } else {
                            diaSub.push([benchMarkName, diaList[d], "플레이트-중-볼트", 90])
                        }
                    } else if (d === diaList.length - 2 || d === diaList.length - 1) {
                        if (end.Box) {
                            diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90])
                        } else {
                            diaSub.push([benchMarkName, diaList[d], "플레이트-상-볼트", 90])
                        }
                    }
                }
                for (let v = 0; v < vStiffList.length; v++) {
                    if (v < 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    } else if (v < diaList.length - 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "수직보강2"]);
                    } else {
                        if (end.Box) {
                            vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                        } else {
                            vStiffSub.push([benchMarkName, vStiffList[v], "수직보강1"]);
                        }
                    }
                }
            }
            spNum = spNum > 30 ? 30 : spNum
            // console.log(spNum)
            let spRull2 = []
            let firstMaxLength = 0;
            let lastMaxLength = 0;
            if (j === 1 && j === supportNum - 3) { //단경간의 경우
                firstMaxLength = segMaxLength
                lastMaxLength =  segMaxLength
            } else {
                if (j === 1) { // 첫경간
                    firstMaxLength = segMaxLength
                    lastMaxLength =  segMaxLength/2
                } else if (j === supportNum - 3) { //마지막경간
                    firstMaxLength = segMaxLength/2
                    lastMaxLength =  segMaxLength
                } else {
                    firstMaxLength = segMaxLength/2
                    lastMaxLength =  segMaxLength/2
                }
            }
            // console.log(i, j, optimizeSplice(spList, totalSp, segMaxLength, firstMaxLength, lastMaxLength))
            // spRull[spNum].forEach(elem => spliceSub.push([benchMarkName, spList[sIndex + elem], "현장이음1"]));
            spRull2 = optimizeSplice(spList, totalSp, segMaxLength, firstMaxLength, lastMaxLength)
            spRull2.forEach(elem => spliceSub.push([benchMarkName, Math.round(spList[elem]), "현장이음1"]));
            // console.log(i, j, spList,totalSp)
            if (end.Box) {
                // if (j === 1) {
                //     lConcSub.push([benchMarkName, 0, 0, 0])
                // }
                // lConcSub.push([benchMarkName, diaList[1], lConcThickness, lConcThickness])
                // lConcSub.push([benchMarkName, diaList[diaList.length - 1], 0, 0])
                // if (j === supportNum - 3) {
                //     lConcSub.push(["G" + (i + 1).toFixed(0) + "S" + (supportNum - 2).toFixed(0), 0, lConcThickness, lConcThickness])
                //     lConcSub.push(["end", 0, 0, 0])  //benchMark, offset, thickness
                // }
                if (j === 1) {
                    lConcSub.push([benchMarkName,"G" + (i + 1).toFixed(0) + "D" + "2" , lConcThickness, lConcThickness])
                } 
                if (j<supportNum - 3 && supportNum > 4){
                    lConcSub.push(["G" + (i + 1).toFixed(0) + "D" + String(diaSub.length - 1),  
                    "G" + (i + 1).toFixed(0) + "D" + String(diaSub.length + 3), lConcThickness, lConcThickness])
                }
                if (j === supportNum - 3) {
                    lConcSub.push(["G" + (i + 1).toFixed(0) + "D" + String(diaSub.length) ,  "G" + (i + 1).toFixed(0) + "S" + (supportNum - 2).toFixed(0), lConcThickness, lConcThickness])
                }

            } else {
                // if (j > 1) {
                //     lConcSub.push([benchMarkName, diaList[1], lConcThickness, lConcThickness])
                // }
                // if (j < supportNum - 3) {
                //     lConcSub.push([benchMarkName, diaList[diaList.length - 1], 0, 0])  //benchMark, offset, thickness
                // }
                // if (j === supportNum - 3) {
                //     lConcSub.push(["end", 0, 0, 0])  //benchMark, offset, thickness
                // }
                if (j<supportNum - 3){
                    lConcSub.push([benchMarkName,"G" + (i + 1).toFixed(0) + "D" + String(diaSub.length - 1),  
                    benchMarkName,"G" + (i + 1).toFixed(0) + "D" + String(diaSub.length + 2), lConcThickness, lConcThickness])
                }
            }

        }

        if (end.Box) {
            diaSub.push(["G" + (i + 1).toFixed(0) + "S" + (supportNum - 2).toFixed(0), 0, "박스부-지점", skew2])
        } else {
            diaSub.push(["G" + (i + 1).toFixed(0) + "S" + (supportNum - 2).toFixed(0), 0, "플레이트-상-볼트", skew2])
        }


        diaLayout.push(diaSub);
        vStiffLayout.push(vStiffSub);
        SpliceLayout.push(spliceSub);
        lConcLayout.push(lConcSub);
    }
    let diaToXbeam = {
        "플레이트-하": "플레이트-하",
        "플레이트-중": "플레이트-중",
        "플레이트-중-볼트": "플레이트-중",
        "플레이트-상-볼트": "플레이트-상",
        "박스부-중앙홀": "박스부",
        "박스부-지점": "박스부",
    }
    let xbeamLayout = [];
    // for (let i = 0; i < diaLayout.length - 1; i++) {
    //     for (let j = 0; j < diaLayout[i].length; j++) {

    //             xbeamLayout.push(
    //                 ["G" + (i + 1).toString() + "D" + (j + 1).toString(),
    //                 "G" + (i + 2).toString() + "D" + (j + 1).toString(),
    //                 diaToXbeam[diaLayout[i][j][2]]]
    //             )
    //             if (diaLayout[i][j][1]===0){
    //             console.log("G" + (i + 1).toString() + "D" + (j + 1).toString())
    //             }
    //     }
    // }
    let supportIndex = []
    for (let i = 0; i < diaLayout.length; i++) {
        supportIndex.push([]);
        for (let j = 0; j < diaLayout[i].length; j++) {
            if (diaLayout[i][j][1] === 0) {
                supportIndex[i].push(j)
            }
        }
    }
    for (let i = 0; i < supportIndex.length - 1; i++) {
        for (let j = 0; j < supportIndex[i].length; j++) {
            xbeamLayout.push(
                ["G" + (i + 1).toString() + "D" + (supportIndex[i][j] + 1).toString(),
                "G" + (i + 2).toString() + "D" + (supportIndex[i + 1][j] + 1).toString(),
                diaToXbeam[diaLayout[i][supportIndex[i][j]][2]]]
            )
            if (j < supportIndex[i].length - 1) {
                let li = supportIndex[i][j + 1];
                let ri = supportIndex[i + 1][j + 1];
                let iter = Math.min(li - supportIndex[i][j], ri - supportIndex[i + 1][j])
                if (j === supportIndex[i].length - 2) {
                    for (let x = 1; x < iter; x++) {
                        xbeamLayout.push(
                            ["G" + (i + 1).toString() + "D" + (supportIndex[i][j] + x + 1).toString(),
                            "G" + (i + 2).toString() + "D" + (supportIndex[i + 1][j] + x + 1).toString(),
                            diaToXbeam[diaLayout[i][supportIndex[i][j] + x][2]]]
                        )
                    }
                } else {
                    for (let x = iter - 1; x > 0; x--) {
                        xbeamLayout.push(
                            ["G" + (i + 1).toString() + "D" + (li - x + 1).toString(),
                            "G" + (i + 2).toString() + "D" + (ri - x + 1).toString(),
                            diaToXbeam[diaLayout[i][li - x][2]]]
                        )
                    }
                }
            }
        }
    }
    return { diaLayout, vStiffLayout, SpliceLayout, xbeamLayout, lConcLayout }
}

export function FactoryJointAutoGen(girderLayout, auto) {
    let girderNum = girderLayout.girderCount;
    let supportNum = girderLayout.supportCount;
    let diaSpacing = auto.diaSpacing??5000; //공통변수
    let TFLayout = [];
    let BFLayout = [];
    let WFLayout = [];
    let thickness1 = 16;
    let thickness2 = 20;
    let thickness3 = 22;
    for (let i = 0; i < girderNum; i++) {
        let TFSub = [];
        let BFSub = [];
        let WFSub = [];

        for (let j = 1; j < supportNum - 1; j++) {
            let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + (j).toFixed(0);
            if (j === 1) {
            } else if (j > 1 && j < supportNum - 2) {
                TFSub.push([benchMarkName, -1.75 * diaSpacing, thickness1]);
                BFSub.push([benchMarkName, -1.25 * diaSpacing, thickness2]);
                WFSub.push([benchMarkName, -2.25 * diaSpacing, thickness1]);

                TFSub.push([benchMarkName, 1.75 * diaSpacing, thickness2]);
                BFSub.push([benchMarkName, 1.25 * diaSpacing, thickness3]);
                WFSub.push([benchMarkName, 2.25 * diaSpacing, thickness2]);

            } else if (j === supportNum - 2) {
                TFSub.push(["end", 0, thickness1]);
                BFSub.push(["end", 0, thickness2]);
                WFSub.push(["end", 0, thickness1]);
            }
        }
        TFLayout.push(TFSub);
        BFLayout.push(BFSub);
        WFLayout.push(WFSub);
    }
    return { TFLayout, BFLayout, WFLayout }
}


export function flangeAutoGen(girderLayout, endSection, supportSection, common, auto) {
    let girderNum = girderLayout.girderCount;
    let supportNum = girderLayout.supportCount;
    let webThickness = 12; //추후 외부에서 받아와야할듯함
    let RibHeight = 150;
    let bottomRibHeight = 220
    let RibThickness = 14;
    let bottomRibThickness = 22
    let diaSpacing = auto.diaSpacing; //공통변수
    let boxLength = diaSpacing * 2; //공통변수로부터
    let taperLength = diaSpacing / 2; //공통변수로부터
    let taperWidth = 800;
    let taperMargin = 250;
    let ufwLayout = [];
    let lfwLayout = [];
    let uRib = [];
    let lRib = [];
    for (let i = 0; i < girderNum; i++) {
        let ufSub = [];
        let lfSub = [];
        let uRibSub = [];
        let lRibSub = [];
        for (let j = 1; j < supportNum - 1; j++) {
            let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + (j).toFixed(0);
            if (j === 1) {
                if (endSection.Box) {
                    ufSub.push([benchMarkName, boxLength/2, supportSection.UF, supportSection.UF, supportSection.UF / 2 - common.B / 2, supportSection.UF / 2 - common.B / 2]);
                    lfSub.push([benchMarkName, boxLength/2, supportSection.LF, supportSection.LF, supportSection.LF / 2 - common.B / 2, supportSection.LF / 2 - common.B / 2]);

                    ufSub.push([benchMarkName, boxLength/2 + taperMargin, supportSection.UF, supportSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                    lfSub.push([benchMarkName, boxLength/2 + taperMargin, supportSection.LF, supportSection.LF, endSection.UF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                    ufSub.push([benchMarkName, boxLength/2 + taperLength, taperWidth, endSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                    lfSub.push([benchMarkName, boxLength/2 + taperLength, taperWidth, endSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);
                    uRibSub.push([benchMarkName, +boxLength/2 + taperMargin, RibThickness, RibHeight, "-400,400"])
                    lRibSub.push([benchMarkName, +boxLength/2 + taperMargin, bottomRibThickness, bottomRibHeight, "-400,400"])
                }
            } else if (j > 1 && j < supportNum - 2) {
                ufSub.push([benchMarkName, -boxLength - taperLength, endSection.UF, endSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                lfSub.push([benchMarkName, -boxLength - taperLength, endSection.LF, endSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                ufSub.push([benchMarkName, -boxLength - taperMargin, endSection.UF, taperWidth, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                lfSub.push([benchMarkName, -boxLength - taperMargin, endSection.LF, taperWidth, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                ufSub.push([benchMarkName, -boxLength, supportSection.UF, supportSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                lfSub.push([benchMarkName, -boxLength, supportSection.LF, supportSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                ufSub.push([benchMarkName, boxLength, supportSection.UF, supportSection.UF, supportSection.UF / 2 - common.B / 2, supportSection.UF / 2 - common.B / 2]);
                lfSub.push([benchMarkName, boxLength, supportSection.LF, supportSection.LF, supportSection.LF / 2 - common.B / 2, supportSection.LF / 2 - common.B / 2]);

                ufSub.push([benchMarkName, boxLength + taperMargin, supportSection.UF, supportSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                lfSub.push([benchMarkName, boxLength + taperMargin, supportSection.LF, supportSection.LF, endSection.UF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                ufSub.push([benchMarkName, boxLength + taperLength, taperWidth, endSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                lfSub.push([benchMarkName, boxLength + taperLength, taperWidth, endSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                uRibSub.push([benchMarkName, -boxLength - taperMargin, 0, 0, ""])
                uRibSub.push([benchMarkName, +boxLength + taperMargin, RibThickness, RibHeight, "-400,400"])
                lRibSub.push([benchMarkName, -boxLength - taperMargin, 0, 0, ""])
                lRibSub.push([benchMarkName, +boxLength + taperMargin, bottomRibThickness, bottomRibHeight, "-400,400"])
            } else if (j === supportNum - 2) {
                if (endSection.Box) {
                    ufSub.push([benchMarkName, -boxLength/2 - taperLength, endSection.UF, endSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                    lfSub.push([benchMarkName, -boxLength/2 - taperLength, endSection.LF, endSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                    ufSub.push([benchMarkName, -boxLength/2 - taperMargin, endSection.UF, taperWidth, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                    lfSub.push([benchMarkName, -boxLength/2 - taperMargin, endSection.LF, taperWidth, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                    ufSub.push([benchMarkName, -boxLength/2, supportSection.UF, supportSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                    lfSub.push([benchMarkName, -boxLength/2, supportSection.LF, supportSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);

                    ufSub.push(["end", 0, supportSection.UF, supportSection.UF, supportSection.UF / 2 - common.B / 2, supportSection.UF / 2 - common.B / 2]);
                    lfSub.push(["end", 0, supportSection.LF, supportSection.LF, supportSection.LF / 2 - common.B / 2, supportSection.LF / 2 - common.B / 2]);


                    uRibSub.push([benchMarkName, -boxLength/2 - taperMargin, 0, 0, ""])
                    lRibSub.push([benchMarkName, -boxLength/2 - taperMargin, 0, 0, ""])
                    uRibSub.push(["end", 0, RibThickness, RibHeight, "-400,400"])
                    lRibSub.push(["end", 0, bottomRibThickness, bottomRibHeight, "-400,400"])

                } else {
                    ufSub.push(["end", 0, endSection.UF, endSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                    lfSub.push(["end", 0, endSection.LF, endSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);
                    uRibSub.push(["end", 0, 0, 0, ""])
                    lRibSub.push(["end", 0, 0, 0, ""])
                }
            }

        }
        ufwLayout.push(ufSub);
        lfwLayout.push(lfSub);
        uRib.push(uRibSub);
        lRib.push(lRibSub);
    }
    return { ufwLayout, lfwLayout, uRib, lRib }
}

export function GirderHeightAutoGen(girderLayout, endSection, supportSection, auto, SEShape) {
    let girderNum = girderLayout.girderCount;
    let supportNum = girderLayout.supportCount;
    let supportData = girderLayout.input.supports;
    // let dh = endSection.SlabH + endSection.HaunchH - supportSection.SlabH - supportSection.HaunchH
    let hLayout = [];
    // let diaSpacing = auto.diaSpacing; //공통변수로부터 입력
    let c0 = 15000; //공통변수로부터 입력 auto.HeightTaperStart
    let c1 = 1250; //공통변수로부터 입력 auto.HeightTaperEnd
    let c2 = 0
    for (let i = 0; i < girderNum; i++) {
        let hSub = [];
        for (let j = 1; j < supportNum - 1; j++) {
            let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + (j).toFixed(0);
            if (j === 1) {
                if (endSection.CutL * endSection.CutH > 0) {
                    c2 = endSection.CutL - (supportData[j][1] - SEShape.start.A + SEShape.start.D)
                    hSub.push([benchMarkName, c2, endSection.H - endSection.CutH, endSection.H - endSection.CutH, "straight"])
                }
            } else if (j > 1 && j < supportNum - 2) {
                hSub.push([benchMarkName, -c0, endSection.H, endSection.H, "straight"])
                hSub.push([benchMarkName, -c1, endSection.H, supportSection.H, "circle"])
                hSub.push([benchMarkName, c1, supportSection.H, supportSection.H, "straight"])
                hSub.push([benchMarkName, c0, supportSection.H, endSection.H, "circle"])
            } else if (j === supportNum - 2) {
                if (endSection.CutL * endSection.CutH > 0) {
                    c2 = endSection.CutL - (supportData[j + 1][1] - SEShape.end.A + SEShape.end.D)
                    hSub.push([benchMarkName, -c2, endSection.H, endSection.H, "straight"])
                    hSub.push(["end", 0, endSection.H - endSection.CutH, endSection.H - endSection.CutH, "straight"])
                } else {
                    hSub.push(["end", 0, endSection.H, endSection.H, "straight"])
                }
            }
        }
        hLayout.push(hSub);
    }
    return { hLayout }
}

export function GridInputFitting(gridInput){
    for (let i in gridInput.point) { // i = D,V,SP
        for (let j in gridInput.point[i]) {
            for (let k in gridInput.point[i][j]) {
                gridInput.point[i][j][k].forEach((el, l) => gridInput.point[i][j][k][l] = isNaN(el * 1) ? el : el * 1)
            }
        }
    }
    for (let i in gridInput.range) { // i = D,V,SP
        for (let j in gridInput.range[i]) {
            for (let k in gridInput.range[i][j]) {
                gridInput.range[i][j][k].forEach((el, l) => gridInput.range[i][j][k][l] = isNaN(el * 1) ? el : el * 1)
            }
        }
    }
    let gridInput2 = {...gridInput, range : {}}
    for (let key in gridInput.range) {
      if (key!=="LC"){
          gridInput2.range[key] = [];
          for (let i = 0; i < gridInput.range[key].length; i++) {
              gridInput2.range[key].push([])
            for (let j = 0; j < gridInput.range[key][i].length - 1; j++) { //반드시 end행이 필요한 이유임, end가 없는 경우 benchmark나 offset에 관계없이 End, 0로 인식해야함
                let elem = gridInput.range[key][i][j];
                let elem2 = gridInput.range[key][i][j+1];
                let pointName = "G" + (i + 1).toFixed(0) + key + (j + 1).toFixed(0);
                let isSame = true;
                elem.slice(2).forEach(function(value, index){
                  if (value !== elem2.slice(2)[index]){
                      isSame = false
                  }
                })
                if (elem[0] === "" || elem[0] === 0 ) {
                console.log("주요부재단면 입력창에 공백 오류", pointName) //공백제거 코드필요
                }  else if ((elem2[1] === elem[1] && elem[0] === elem2[0])
                || isSame ){
                console.log(pointName, "단면 중복제거")
                } else {
                    gridInput2.range[key][i].push(gridInput.range[key][i][j])
                }
            }
            gridInput2.range[key][i].push(["end", 0, ...gridInput.range[key][i][gridInput.range[key][i].length-1].slice(2)])
          }
      } else {
        gridInput2.range["LC"] = gridInput.range["LC"]
      }
    }
    return gridInput2
  }

  export function EtcPartAuto(girderStation, sectionPointDict) {

    let jackupLayout //= JackupAutoGen(girderStation, sectionPointDict)
    let studLayout // = StudAutoGen(girderStation, sectionPointDict)
    let supportLayout //= SupportAutoGen(girderStation, sectionPointDict)
    let hStiffLayout = hStiffnerAutoGen(girderStation, sectionPointDict)
    return { jackupLayout, studLayout, supportLayout, hStiffLayout }
}

function hStiffnerAutoGen(girderStation, sectionPointDict) {
    let result = [];
    let width = 180
    let chamfer = width - 10;
    let thickness = 16
    let offset1 = 400;
    let offset2 = 400;
    let startMargin = 42;
    let endMargin = 42;
    let supportStationList = [];
    for (let i in girderStation) {
        supportStationList.push([])
        for (let j in girderStation[i]) {
            if (girderStation[i][j].key.includes("S") && !girderStation[i][j].key.includes("SP")) {
                supportStationList[i].push(girderStation[i][j].point.girderStation)
            }
        }
    }
    let tensionRegion = []; // 인장기준 0.2~0.8
    let compressRegion = []; // 압축기준 -0.4 ~ 0.4
    for (let i in supportStationList) {
        tensionRegion.push([]);
        compressRegion.push([]);
        for (let j = 0; j < supportStationList[i].length - 1; j++) {
            let length = supportStationList[i][j + 1] - supportStationList[i][j]
            if (j === 0) {
                tensionRegion[i].push([0, supportStationList[i][j + 1] - 0.2 * length])
            } else if (j === supportStationList[i].length - 2) {
                tensionRegion[i].push([supportStationList[i][j] + 0.2 * length, supportStationList[i][j + 1]])
            } else {
                tensionRegion[i].push([supportStationList[i][j] + 0.2 * length, supportStationList[i][j + 1] - 0.2 * length])
            }
            if (j > 0) {
                compressRegion[i].push([supportStationList[i][j] - 0.4 * length, supportStationList[i][j] + 0.4 * length])
            }
        }
    }
    for (let i in girderStation) {
        for (let j = 0; j < girderStation[i].length - 1; j++) {
            let key1 = girderStation[i][j].key
            let bool1 = ["SP", "K1", "K6", "D", "V"].some(el => key1.includes(el))
            if (bool1) {
                let pt1 = girderStation[i][j].point
                for (let k = j + 1; k < girderStation[i].length; k++) {
                    let key2 = girderStation[i][k].key
                    let pt2 = girderStation[i][k].point
                    let bool2 = ["SP", "K1", "K6", "D", "V"].some(el => key2.includes(el))
                    if ((pt2.girderStation - pt1.girderStation) > width * 2 && bool2) {
                        let station = (pt2.girderStation + pt1.girderStation) / 2;
                        let startOff = key1.includes("SP") ? 600 / 2 + 30 : startMargin
                        let endOff = key2.includes("SP") ? 600 / 2 + 30 : endMargin
                        for (let t in tensionRegion[i]) {
                            if (station >= tensionRegion[i][t][0] && station <= tensionRegion[i][t][1]) {
                                // result.push({ from, to, startOffset: endOffset, width, thickness, chamfer, isTop, offset})
                                result.push([key1, key2, startOff, endOff, width, thickness, chamfer, true, offset1, offset2])
                                break;
                            }
                        }
                        for (let t in compressRegion[i]) {
                            if (station >= compressRegion[i][t][0] && station <= compressRegion[i][t][1]) {
                                // result.push({ from, to, startOffset: endOffset, width, thickness, chamfer, isTop, offset})
                                let cOffset1 = offset1
                                let cOffset2 = offset2
                                if (sectionPointDict[key1].forward.input.Tcl > 0) {
                                    cOffset1 = sectionPointDict[key1].forward.input.Tcl + 200
                                    cOffset2 = sectionPointDict[key2].backward.input.Tcl + 200
                                }
                                result.push([key1, key2, startOff, endOff, width, thickness, chamfer, false, cOffset1, cOffset2])
                                break;
                            }
                        }
                        j = k - 1
                        break
                    }
                }
            }
        }
    }
    return result
}