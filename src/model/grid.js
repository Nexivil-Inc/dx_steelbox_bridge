import { IntersectionPointOnSpline, MainPointGenerator, splineProp, StPointToParallel, Alignment } from "@nexivil/package-modules";

export function GenGridInfoFn(girderBaseInfo, girderLayout, seShape, gridInput) {
    let gridPointDict = {};
    let xbeamGridInfo = [];
    let girderStations = [];
    let centerLineStations = [];

    const alignment = girderLayout.alignment;
    const xbeamLayout = gridInput.xbeamLayout;
    const girderNumber = girderLayout.girderSplines.length;
    const blockOutH = girderBaseInfo.common.blockOutH;
    const blockOutL = girderBaseInfo.common.blockOutL;

    let pointName = "";
    let offset = 0;
    for (let k = 0; k < 8; k++) {
        //단부종점에 대한 그리드포인트
        switch (k) {
            case 0:
                offset = seShape.start.A;
                break;
            case 1:
                offset = seShape.start.A + seShape.start.D;
                break;
            case 2:
                offset = seShape.start.A + seShape.start.D + seShape.start.F;
                break;
            case 3:
                offset = seShape.start.A + seShape.start.D + seShape.start.F + seShape.start.G;
                break;
            case 4:
                offset = -(seShape.end.A + seShape.end.D + seShape.end.F + seShape.end.G);
                break;
            case 5:
                offset = -(seShape.end.A + seShape.end.D + seShape.end.F);
                break;
            case 6:
                offset = -(seShape.end.A + seShape.end.D);
                break;
            case 7:
                offset = -seShape.end.A;
                break;
        }
        let mainPt = k < 4 ? girderLayout.startPoint : girderLayout.endPoint;
        let parallelStPt = StPointToParallel(mainPt, offset, alignment);
        for (let i = 0; i < girderNumber; i++) {
            pointName = "G" + (i + 1) + "K" + k;
            gridPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], parallelStPt, alignment);
        }
        gridPointDict["CRK" + k] = parallelStPt;
    }

    for (let k in girderLayout.gridKeyPoint) {
        //지점에 대한 그리드포인트
        let centerPoint = girderLayout.gridKeyPoint[k];
        for (let i = 0; i < girderNumber; i++) {
            pointName = "G" + (i + 1) + k.substr(2);
            gridPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], centerPoint, alignment);
        }
        gridPointDict[k] = centerPoint;
    }

    const BenchMark = 0;
    const off = 1;
    for (let key in gridInput.range) {
        if (key !== "LC") {
            for (let i = 0; i < gridInput.range[key].length; i++) {
                let index = 1;
                for (let j = 0; j < gridInput.range[key][i].length - 1; j++) {
                    //반드시 end행이 필요한 이유임, end가 없는 경우 benchmark나 offset에 관계없이 End, 0로 인식해야함
                    let elem = gridInput.range[key][i][j];
                    pointName = "G" + (i + 1).toFixed(0) + key + String(index);
                    if (elem[0] === "" || elem[0] === 0) {
                        console.log("주요부재단면 입력창에 공백 오류", pointName);
                    } else {
                        if (elem[off] * 1 === 0) {
                            gridPointDict[pointName] = gridPointDict[elem[BenchMark]];
                        } else {
                            let mainStation = gridPointDict[elem[BenchMark]].mainStation + elem[off] * 1;
                            let mainPoint = MainPointGenerator(mainStation, alignment);
                            gridPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], mainPoint, alignment);
                        }
                        index++;
                    }
                }
            }
        }
    }
    for (let key in gridInput.point) {
        for (let i = 0; i < gridInput.point[key].length; i++) {
            for (let j = 0; j < gridInput.point[key][i].length; j++) {
                let elem = gridInput.point[key][i][j];
                pointName = "G" + (i + 1).toFixed(0) + key + (j + 1).toFixed(0);
                if (elem[0] === "" || elem[0] === 0) {
                    console.log("주요부재배치 입력창에 공백 오류", pointName);
                } else {
                    if (elem[off] * 1 === 0) {
                        gridPointDict[pointName] = gridPointDict[elem[BenchMark]];
                    } else {
                        let skew = elem[3] ? (elem[3] * Math.PI) / 180 : null;
                        let mainStation = gridPointDict[elem[BenchMark]].mainStation + elem[off] * 1;
                        let mainPoint = MainPointGenerator(mainStation, alignment, skew);
                        gridPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], mainPoint, alignment, true);
                    }
                }
            }
        }
    }
    //하부콘크리트 별도 관리
    for (let i = 0; i < gridInput.range["LC"].length; i++) {
        for (let j = 0; j < gridInput.range["LC"][i].length; j++) {
            let elem = gridInput.range["LC"][i][j];
            pointName = "G" + (i + 1).toFixed(0) + "LC" + (j + 1).toFixed(0);
            if (elem[0] === "" || elem[0] === 0) {
                console.log("주요부재단면 입력창에 공백 오류", pointName);
            } else {
                gridPointDict[pointName + "-1"] = gridPointDict[elem[0]];
                gridPointDict[pointName + "-2"] = gridPointDict[elem[1]];
            }
        }
    }

    let i = 0;
    let k0Pt = gridPointDict["CRK0"];
    let k3Pt = gridPointDict["CRK3"];
    let k4Pt = gridPointDict["CRK4"];
    let k7Pt = gridPointDict["CRK7"];
    girderLayout.alignment.points.forEach(function (point) {
        let st = point.mainStation;
        if (st > k0Pt.station && st < k3Pt.station) {
            let skew = StPointToParallel(k0Pt, st - k0Pt.station, alignment).skew;
            gridPointDict["CRN" + i] = { ...point, skew };
            i++;
        } else if (st > k4Pt.station && st < k7Pt.station) {
            let skew = StPointToParallel(k7Pt, st - k7Pt.station, alignment).skew;
            gridPointDict["CRN" + i] = { ...point, skew };
            i++;
        } else if (st > k3Pt.station && st < k4Pt.station) {
            gridPointDict["CRN" + i] = { ...point, skew: Math.PI / 2 };
            i++;
        }
    });

    for (let k of [
        ["CRK0", 1, "CRB0"],
        ["CRK7", -1, "CRB7"],
    ]) {
        if (blockOutH > 0 && blockOutL > 0) {
            let stPoint = StPointToParallel(gridPointDict[k[0]], k[1] * blockOutL, alignment);
            centerLineStations.push({ point: stPoint, station: stPoint.mainStation, key: k[2] });
        }
    }

    let dummyIndex = [];
    for (let i = 0; i < xbeamLayout.length; i++) {
        if (!dummyIndex.includes(i)) {
            let subList = [xbeamLayout[i][0], xbeamLayout[i][1]];
            let nameList = [xbeamLayout[i][2]];
            let a = 1;
            let ptName = xbeamLayout[i][1];
            let iter = 0;
            while (a && iter < 20) {
                a = xbeamLayout.find(function (el, index) {
                    if (el[0] === ptName) {
                        dummyIndex.push(index);
                        ptName = el[1];
                        return true;
                    }
                });
                iter++;
                if (a) {
                    subList.push(a[1]);
                    nameList.push(a[2]);
                }
            }
            xbeamGridInfo.push({ gridPoint: subList, xbeamType: nameList });
        }
    }
    for (let i = 0; i < xbeamGridInfo.length; i++) {
        let gridNum = xbeamGridInfo[i].gridPoint.length;
        let mainStation = 0;
        let skew = 0;
        let key = "CRX" + (i + 1).toFixed(0);
        for (let j in xbeamGridInfo[i].gridPoint) {
            mainStation += gridPointDict[xbeamGridInfo[i].gridPoint[j]].mainStation / gridNum;
            skew += gridPointDict[xbeamGridInfo[i].gridPoint[j]].skew / gridNum;
        }
        let point = MainPointGenerator(mainStation, alignment, skew);
        centerLineStations.push({ station: mainStation, key, point });
        gridPointDict[key] = point; //<==그리드 포인트에도 추가
    }

    for (let k in gridPointDict) {
        let girderIndex = k.substr(1, 1) - 1;
        if (girderStations.length <= girderIndex) {
            for (let i = 0; i <= girderIndex - girderStations.length; i++) {
                girderStations.push([]);
            }
        }

        if (k.substr(0, 1) === "G") {
            let s = gridPointDict[k].mainStation;
            if (s >= gridPointDict["G" + (girderIndex + 1) + "K1"].mainStation && s <= gridPointDict["G" + (girderIndex + 1) + "K6"].mainStation) {
                girderStations[girderIndex].push({
                    station: gridPointDict[k].mainStation,
                    key: k,
                    point: gridPointDict[k],
                });
            }
        } else {
            //CR로 생성되는 노드에 대해서 추가됨
            centerLineStations.push({ station: gridPointDict[k].mainStation, key: k, point: gridPointDict[k] });
        }
        if (k.includes("1TW")) {
            let point = MainPointGenerator(gridPointDict[k].mainStation, alignment, gridPointDict[k].skew);
            centerLineStations.push({ station: gridPointDict[k].mainStation, key: k, point });
        }
    }
    girderStations.forEach(function (elem) {
        elem.sort(function (a, b) {
            return a.station < b.station ? -1 : 1;
        });
    });
    //곡선구간이나 사교의 경우 마스터스테이션으로 정렬했을 경우 순서가뒤집히는 오류가 발생함

    centerLineStations.sort(function (a, b) {
        return a.station < b.station ? -1 : 1;
    });

    let spanLength = [];
    for (let i = 0; i < girderStations.length; i++) {
        let spanNum = 0;
        let totalLength = 0;
        let segLength = 0;
        spanLength.push([0]);
        let dummy0 = {};
        let segNum = 1;
        for (let j = 0; j < girderStations[i].length; j++) {
            let gridObj = girderStations[i][j];
            if (j !== 0) {
                segLength = splineProp(dummy0, gridObj.point).length;
            }
            totalLength += segLength;
            dummy0 = gridObj.point;
            girderStations[i][j]["point"]["girderStation"] = totalLength;
            girderStations[i][j]["point"]["spanNum"] = spanNum;
            if (
                girderStations[i][j]["key"].includes("K6") ||
                (girderStations[i][j]["key"].includes("S") && !girderStations[i][j]["key"].includes("SP"))
            ) {
                spanLength[i].push(totalLength);
                spanNum += 1;
            }
            if (girderStations[i][j]["key"].includes("SP")) {
                segNum += 1;
            }
            girderStations[i][j]["point"]["segNum"] = segNum;
            girderStations[i][j]["point"]["girderNum"] = i + 1;
        }
    }

    for (let i = 0; i < girderStations.length; i++) {
        for (let j = 0; j < girderStations[i].length; j++) {
            girderStations[i][j]["point"]["spanLength"] =
                spanLength[i][girderStations[i][j]["point"]["spanNum"] + 1] - spanLength[i][girderStations[i][j]["point"]["spanNum"]];
            girderStations[i][j]["point"]["spanPoint"] =
                (girderStations[i][j]["point"]["girderStation"] - spanLength[i][girderStations[i][j]["point"]["spanNum"]]) /
                girderStations[i][j]["point"]["spanLength"];
        }
    }

    return { gridPointDict, xbeamGridInfo, centerLineStations, girderStations };
}

export function GenDefaultGridPointDict(girderLayout, seShape) {
    let nameToPointDict = {};
    let alignment = girderLayout.alignment;
    let pointName = "";
    let offset = 0;
    const girderNumber = girderLayout.girderSplines.length;
    for (let k = 0; k < 8; k++) {
        //단부종점에 대한 그리드포인트
        switch (k) {
            case 0:
                offset = seShape.start.A;
                break;
            case 1:
                offset = seShape.start.A + seShape.start.D;
                break;
            case 2:
                offset = seShape.start.A + seShape.start.D + seShape.start.F;
                break;
            case 3:
                offset = seShape.start.A + seShape.start.D + seShape.start.F + seShape.start.G;
                break;
            case 4:
                offset = -(seShape.end.A + seShape.end.D + seShape.end.F + seShape.end.G);
                break;
            case 5:
                offset = -(seShape.end.A + seShape.end.D + seShape.end.F);
                break;
            case 6:
                offset = -(seShape.end.A + seShape.end.D);
                break;
            case 7:
                offset = -seShape.end.A;
                break;
        }
        let mainPt = k < 4 ? girderLayout.startPoint : girderLayout.endPoint;
        let parallelStPt = StPointToParallel(mainPt, offset, alignment);
        for (let i = 0; i < girderNumber; i++) {
            pointName = "G" + (i + 1) + "K" + k;
            nameToPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], parallelStPt, alignment);
        }
        nameToPointDict["CRK" + k] = parallelStPt;
    }
    for (let k in girderLayout.gridKeyPoint) {
        //지점에 대한 그리드포인트
        let centerPoint = girderLayout.gridKeyPoint[k];
        for (let i = 0; i < girderNumber; i++) {
            pointName = "G" + (i + 1) + k.substr(2);
            nameToPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], centerPoint, alignment);
        }
        nameToPointDict[k] = centerPoint;
    }
    return nameToPointDict;
}

export function FittingGridInputFn(gridInput) {
    for (let i in gridInput.point) {
        // i = D,V,SP
        for (let j in gridInput.point[i]) {
            for (let k in gridInput.point[i][j]) {
                gridInput.point[i][j][k].forEach((el, l) => (gridInput.point[i][j][k][l] = isNaN(el * 1) ? el : el * 1));
            }
        }
    }
    for (let i in gridInput.range) {
        // i = D,V,SP
        for (let j in gridInput.range[i]) {
            for (let k in gridInput.range[i][j]) {
                gridInput.range[i][j][k].forEach((el, l) => (gridInput.range[i][j][k][l] = isNaN(el * 1) ? el : el * 1));
            }
        }
    }
    let gridInput2 = { ...gridInput, range: {} };
    for (let key in gridInput.range) {
        if (key !== "LC") {
            gridInput2.range[key] = [];
            for (let i = 0; i < gridInput.range[key].length; i++) {
                gridInput2.range[key].push([]);
                for (let j = 0; j < gridInput.range[key][i].length - 1; j++) {
                    //반드시 end행이 필요한 이유임, end가 없는 경우 benchmark나 offset에 관계없이 End, 0로 인식해야함
                    let elem = gridInput.range[key][i][j];
                    let elem2 = gridInput.range[key][i][j + 1];
                    let pointName = "G" + (i + 1).toFixed(0) + key + (j + 1).toFixed(0);
                    let isSame = true;
                    elem.slice(2).forEach(function (value, index) {
                        if (value !== elem2.slice(2)[index]) {
                            isSame = false;
                        }
                    });
                    if (elem[0] === "" || elem[0] === 0) {
                        console.log("주요부재단면 입력창에 공백 오류", pointName); //공백제거 코드필요
                    } else if ((elem2[1] === elem[1] && elem[0] === elem2[0]) || isSame) {
                        // console.log(pointName, "단면 중복제거");
                    } else {
                        gridInput2.range[key][i].push(gridInput.range[key][i][j]);
                    }
                }
                gridInput2.range[key][i].push(["end", 0, ...gridInput.range[key][i][gridInput.range[key][i].length - 1].slice(2)]);
            }
        } else {
            gridInput2.range["LC"] = gridInput.range["LC"];
        }
    }
    return gridInput2;
}
