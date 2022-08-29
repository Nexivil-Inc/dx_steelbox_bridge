import {
    DrawCenterLine,
    DrawMatchLine,
    GetRefPoint,
    IsPointInPolygon,
    Layout2D,
    Line,
    LineToOffsetSpline,
    paperSize,
    Plot2D,
    PointToDraw,
    PointToGlobal,
    splineProp,
    Text,
    ToDimAlign,
    Trim2D,
} from "@nexivil/package-modules";
import { DrawGirderMiniMap, GenPartPlanDraw, GenPartSideDraw, GenWeldingDetailDraw, GetRoundedRect, GetWeldingInfo } from "./utils";

export function GenBoxGirder2DFn(
    girderLayout,
    girderStations,
    gridPointDict,
    sectionPointDict,
    steelBoxDict,
    mainPartDict,
    etcPartDict = {},
    studDict = {},
    layout,
    propsGeneral,
    propsDetail
) {
    let result = [];
    const girderNum = girderLayout.girderCount;
    const supportNum = girderLayout.supportCount - 2;
    const ps = paperSize[propsGeneral.size];
    const paperScale = propsGeneral ? propsGeneral.scale : 1;
    const fontSize = 3 * paperScale;

    const pxOffset = ps.x * paperScale;
    const pyOffset = ps.y * paperScale;
    let top = [];
    let bottom = [];
    let side = [];

    let xbeamDict = mainPartDict["xbeam"];
    let gKey = "G1"; // + girderNum.toFixed(0);
    // _.mapflat 이용하여 단축시도 필요
    let idDict = {
        D: _.groupBy(mainPartDict["dia"]["parent"], "id"),
        V: _.groupBy(mainPartDict["vstiff"]["parent"], "id"),
        // SP : _.groupBy(etcPartDict["splice"]["parent"], "id"),
        C: _.groupBy(mainPartDict["xbeam"]["parent"], "id"),
    };
    let idNameDict = {};
    for (let key in idDict) {
        let diaNum = 1;
        for (let id in idDict[key]) {
            for (let dia in idDict[key][id]) {
                idNameDict[idDict[key][id][dia]["part"]] = key + String(diaNum);
            }
            diaNum++;
        }
    }
    for (let i in steelBoxDict["children"]) {
        if (steelBoxDict["children"][i]["model"]["topView"]) {
            top.push(...steelBoxDict["children"][i]["model"]["topView"]);
        }
        if (steelBoxDict["children"][i]["model"]["bottomView"]) {
            bottom.push(...steelBoxDict["children"][i]["model"]["bottomView"]);
        }
        if (steelBoxDict["children"][i]["model"]["sideView"] && steelBoxDict["children"][i]["meta"]["part"].slice(0, 2) === gKey) {
            side.push(...steelBoxDict["children"][i]["model"]["sideView"]);
        }
    }
    for (let i in mainPartDict) {
        for (let j in mainPartDict[i]["children"]) {
            top.push(...GenPartPlanDraw(mainPartDict[i]["children"][j], true));
            bottom.push(...GenPartPlanDraw(mainPartDict[i]["children"][j], false));
            if (mainPartDict[i]["children"][j]["meta"]["part"].slice(0, 2) === gKey) {
                if (i !== "xbeam") {
                    side.push(...GenPartSideDraw(mainPartDict[i]["children"][j]));
                }
            }
        }
    }
    // for (let i in etcPartDict) {
    //     for (let j in etcPartDict[i]["children"]) {
    //         top.push(...GenPartPlanDraw(etcPartDict[i]["children"][j], true));
    //         bottom.push(...GenPartPlanDraw(etcPartDict[i]["children"][j], false));
    //         if (etcPartDict[i]["children"][j]["meta"]["part"].includes(gKey)) {
    //             side.push(...GenPartSideDraw(etcPartDict[i]["children"][j]));
    //         }
    //     }
    // }
    let studSidePoints = [];
    // for (let j in studDict["children"]) {
    //     if (studDict["children"][j]["meta"]["part"].slice(0, 2) === gKey) {
    //         if (studDict["children"][j]["model"] && studDict["children"][j]["model"]["sideView"]) {
    //             let type = studDict["children"][j]["type"];
    //             let rotX = studDict["children"][j]["rotX"];
    //             let rotY = studDict["children"][j]["rotY"];
    //             let rotZ = studDict["children"][j]["rotZ"];
    //             let pts = studDict["children"][j]["model"]["sideView"];
    //             let info = studDict["children"][j]["stud"];
    //             for (let p in pts) {
    //                 side.push(...StudSideDraw(pts[p], rotX, rotY, rotZ, type, info));
    //             }
    //             studSidePoints.push(...studDict["children"][j]["model"]["sideView"]);
    //         }
    //     }
    // }
    let matchLines = ["K1"];
    for (let s = 2; s < supportNum; s++) {
        matchLines.push("S" + s.toFixed(0));
    }
    matchLines.push("K6");

    const girderList = girderLayout.input.girders;
    const centerOffset = (girderList[0][1] + girderList[girderList.length - 1][1]) / 2;
    const centerGirderIndex = Math.floor(girderNum / 2);
    const girderSplines = girderLayout.girderSplines;
    for (let mx = 0; mx < matchLines.length - 1; mx++) {
        let plan = { draw: [], dim: [], tag: [] };
        let side2 = { draw: [], dim: [], tag: [] };

        let xOffset = (mx + 0.5) * pxOffset;
        let sKey = matchLines[mx];
        let eKey = matchLines[mx + 1];
        let startKey = gKey + sKey;
        let endKey = gKey + eKey;
        let nStartKey = mx === 0 ? gKey + "K0" : gKey + sKey;
        let nEndKey = mx === matchLines.length - 2 ? gKey + "K7" : gKey + eKey;
        let startPoint = gridPointDict[nStartKey];
        let endPoint = gridPointDict[nEndKey];
        let l1 = LineToOffsetSpline(girderSplines[0], -2300, startPoint, endPoint).points;
        let l2 = LineToOffsetSpline(girderSplines[centerGirderIndex], centerOffset - girderList[centerGirderIndex][1], startPoint, endPoint).points;
        let l3 = LineToOffsetSpline(girderSplines[girderNum - 1], 2300, startPoint, endPoint).points;

        let rot = -1 * Math.atan2(l2[l2.length - 1].y - l2[0].y, l2[l2.length - 1].x - l2[0].x);
        let boundaryAll = [...l1, ...l3.reverse()];
        let boundary1 = [...l1.reverse(), ...l2];
        let boundary2 = [...l2, ...l3];
        if (mx < matchLines.length - 2) plan["draw"].push(...DrawMatchLine([l1[0], l3[0]], fontSize, "M.L."));
        if (mx > 0) plan["draw"].push(...DrawMatchLine([l1[l1.length - 1], l3[l3.length - 1]], fontSize, "M.L."));

        plan["draw"].push(...DrawCenterLine(l2, fontSize, "상부플랜지", "하부플랜지"));
        plan["draw"].push(...Trim2D(top, boundary1));
        plan["draw"].push(...Trim2D(bottom, boundary2));
        let startMargin = mx === 0 ? 100 : 0;
        let endMargin = mx === matchLines.length - 2 ? 100 : 0;
        let sideBoundary = [
            { x: gridPointDict[startKey].girderStation - startMargin, y: 0 }, //l2[0].z },
            { x: gridPointDict[endKey].girderStation + endMargin, y: 0 }, //l2[l2.length - 1].z },
            { x: gridPointDict[endKey].girderStation + endMargin, y: -5000 }, //l2[l2.length - 1].z - 5000 },
            { x: gridPointDict[startKey].girderStation - startMargin, y: -5000 },
        ]; //l2[0].z - 5000 }];
        side2["draw"].push(...Trim2D(side, sideBoundary));
        let miniMapXoffset = 15 * paperScale + mx * pxOffset;
        let miniMapYoffset = (ps.y - 15) * paperScale;
        result.push(
            ...DrawGirderMiniMap(girderStations, steelBoxDict, 1, girderNum, miniMapXoffset, miniMapYoffset, paperScale / 1500, fontSize, boundaryAll)
        );

        let dimTitle = [
            { name: "총 길이", splicer: [], offsetIndex: 4, offset: 2000 },
            { name: "현장이음", splicer: ["SP"], offsetIndex: 3, offset: 2000 },
            { name: "상판공장이음", splicer: ["SP", "TF"], offsetIndex: 2, offset: 2000 },
        ];
        let dimTitle2 = [
            { name: "다이아프램", splicer: ["D"], offsetIndex: 4, offset: -2000 },
            { name: "현장이음", splicer: ["SP"], offsetIndex: 3, offset: -2000 },
            { name: "하판공장이음", splicer: ["SP", "BF"], offsetIndex: 2, offset: -2000 },
        ];
        let dimTopPoints = [];
        let dimBottomPoints = [];
        let dimSidePoints = [];
        let startI = 0;
        let endI = 0;
        let startI2 = 0;
        let endI2 = 0;

        for (let j = 0; j < girderStations[0].length; j++) {
            let gridObj = girderStations[0][j];
            dimTopPoints.push(gridObj.point);
            dimSidePoints.push({
                x: gridObj.point.girderStation,
                y: 0,
                normalCos: 0,
                normalSin: -1,
                mainStation: gridObj.point.mainStation,
            });
            if (gridObj.key === startKey) {
                startI = j;
            } else if (gridObj.key === endKey) {
                endI = j;
            }
        }
        for (let j = 0; j < girderStations[0].length; j++) {
            let gridObj = girderStations[0][j];
            if (j >= startI && j <= endI) {
                //marker
                if (gridObj.key.includes("V") || gridObj.key.includes("D") || gridObj.key.includes("SP") || gridObj.key.includes("F")) {
                    let markTop = 0;
                    if (gridObj.key.substr(2, 1) === "V" || gridObj.key.substr(2, 1) === "D") {
                        markTop = 2 * fontSize;
                    }
                    let cos = gridObj.point.normalCos;
                    let sin = gridObj.point.normalSin;
                    let localRot = Math.atan2(cos, -sin);
                    let position = PointToDraw(gridObj.point, 1, { x: 0, y: 0 }, 0, 0, 2000 + markTop, 0, 0);
                    let position2 = PointToDraw({ x: gridObj.point.girderStation, y: 0 }, 1, { x: 0, y: 0 }, 0, 0, 1000 + markTop, 0, 0);
                    plan["draw"].push(
                        new Line(GetRoundedRect(position.x, position.y, localRot, fontSize * 4, 2 * fontSize, fontSize), "RED", true, null)
                    );
                    plan["draw"].push(new Text(position, idNameDict[gridObj.key] ?? gridObj.key, fontSize, localRot, "center", "CZ-TEX0"));

                    side2["draw"].push(
                        new Line(GetRoundedRect(position2.x, position2.y, 0, fontSize * 4, 2 * fontSize, fontSize), "RED", true, null)
                    );
                    side2["draw"].push(new Text(position2, idNameDict[gridObj.key] ?? gridObj.key, fontSize, 0, "center", "CZ-TEX0"));
                }
                gridObj.key;
            }
        }
        //가로보 ID 마크 표시
        for (let gridObj of xbeamDict["parent"]) {
            if (IsPointInPolygon(gridObj.point, boundaryAll, false)) {
                let cos = gridObj.point.normalCos;
                let sin = gridObj.point.normalSin;
                let localRot = Math.atan2(cos, -sin);
                let position = PointToDraw(gridObj.point, 1, { x: 0, y: 0 }, 0, 750, 500, 0, 0);
                plan["draw"].push(
                    new Line(GetRoundedRect(position.x, position.y, localRot, fontSize * 4, 2 * fontSize, fontSize), "RED", true, null)
                );
                plan["draw"].push(new Text(position, idNameDict[gridObj.key] ?? gridObj.key, fontSize, localRot, "center", "CZ-TEX0"));
            }
        }

        let startKey2 = "G" + String(girderNum) + sKey;
        let endKey2 = "G" + String(girderNum) + eKey;

        for (let j = 0; j < girderStations[girderNum - 1].length; j++) {
            let gridObj = girderStations[girderNum - 1][j];
            dimBottomPoints.push(gridObj.point);
            if (gridObj.key === startKey2) {
                startI2 = j;
            } else if (gridObj.key === endKey2) {
                endI2 = j;
            }
        }

        for (let dims of dimTitle) {
            let dimIndex = [];
            let subText = [];
            let splicer = dims.splicer;
            let dy = dims.offset >= 0 ? 9 * paperScale : -9 * paperScale;
            let cOffset = dims.offset + dims.offsetIndex * dy;
            for (let j = 0; j < girderStations[0].length; j++) {
                let gridObj = girderStations[0][j];
                let bool = false; //노드가 구분자일 경우 true를 반환
                if (j === 0 || j === girderStations[0].length - 1) {
                    bool = true;
                }
                splicer.forEach(s => (bool = gridObj.key.includes(s) ? true : bool));
                if (bool) {
                    dimIndex.push(j);
                    if (splicer.includes("TF") || splicer.includes("BF") || splicer.includes("WF")) {
                        let thickness = 0;
                        if (splicer.includes("TF")) {
                            thickness = sectionPointDict[gridObj.key].forward.input.tuf;
                        } else if (splicer.includes("BF")) {
                            thickness = sectionPointDict[gridObj.key].forward.input.tlf;
                        } else if (splicer.includes("WF")) {
                            thickness = sectionPointDict[gridObj.key].forward.input.tw;
                        }
                        subText.push("(T=" + thickness.toString() + "mm)");
                    }
                }
            }
            plan["draw"].push(...GenPlanDim(dimTopPoints, dimIndex, startI, endI, paperScale, dims["name"], cOffset, dy, subText));
        }

        for (let dims of dimTitle2) {
            let dimIndex = [];
            let splicer = dims.splicer;
            let dy = dims.offset >= 0 ? 9 * paperScale : -9 * paperScale;
            let cOffset = dims.offset + dims.offsetIndex * dy;
            for (let j = 0; j < girderStations[girderNum - 1].length; j++) {
                let gridObj = girderStations[girderNum - 1][j];
                let bool = false; //노드가 구분자일 경우 true를 반환
                if (j === 0 || j === girderStations[girderNum - 1].length - 1) {
                    bool = true;
                }
                splicer.forEach(s => (bool = gridObj.key.includes(s) ? true : bool));
                if (bool) {
                    dimIndex.push(j);
                }
            }
            plan["draw"].push(...GenPlanDim(dimBottomPoints, dimIndex, startI2, endI2, paperScale, dims["name"], cOffset, dy));
        }
        let dimTitle3 = [
            { name: "총 길이", splicer: [], offsetIndex: 4, offset: 1000 },
            { name: "현장이음", splicer: ["SP"], offsetIndex: 3, offset: 1000 },
            { name: "복부판공장이음", splicer: ["SP", "WF"], offsetIndex: 2, offset: 1000 },
            { name: "하부콘크리트", splicer: ["LC"], offsetIndex: 1, offset: -3500 },
            { name: "수직보강재", splicer: ["D", "V"], offsetIndex: 0, offset: -3500 },
        ];
        for (let dims of dimTitle3) {
            let dimIndex = [];
            let splicer = dims.splicer;
            let dy = dims.offset >= 0 ? 9 * paperScale : -9 * paperScale;
            let cOffset = dims.offset + dims.offsetIndex * dy;
            for (let j = 0; j < girderStations[0].length; j++) {
                let gridObj = girderStations[0][j];
                let bool = false; //노드가 구분자일 경우 true를 반환
                if (j === 0 || j === girderStations[0].length - 1) {
                    bool = true;
                }
                splicer.forEach(s => (bool = gridObj.key.includes(s) ? true : bool));
                if (bool) {
                    dimIndex.push(j);
                }
            }
            side2["draw"].push(...GenPlanDim(dimSidePoints, dimIndex, startI, endI, paperScale, dims["name"], cOffset, dy));
        }

        let srot = Math.atan2(dimTopPoints[startI].normalCos, -dimTopPoints[startI].normalSin) + rot;
        let erot = Math.atan2(dimTopPoints[endI].normalCos, -dimTopPoints[endI].normalSin) + rot;
        // let srot = dimTopPoints[startI].zRotation +dimTopPoints[startI].skew;
        // let erot = dimTopPoints[endI].zRotation +dimTopPoints[endI].skew;
        let sDim = GetVerticalDimPoints(sectionPointDict, girderStations, sKey, 0);
        let eDim = GetVerticalDimPoints(sectionPointDict, girderStations, eKey, 0);

        plan["dim"].push(
            ToDimAlign(sDim.plan, fontSize, "DIM", false, true, srot, 0, 1),
            ToDimAlign([sDim.plan[0], sDim.plan[sDim.plan.length - 1]], fontSize, "DIM", false, true, srot, 0, 2),
            ToDimAlign(eDim.plan, fontSize, "DIM", false, false, erot, 0, 1),
            ToDimAlign([eDim.plan[0], eDim.plan[eDim.plan.length - 1]], fontSize, "DIM", false, false, erot, 0, 2)
        );
        side2["dim"].push(
            ToDimAlign(sDim.side, fontSize, "DIM", false, true, 0, 0, 1),
            ToDimAlign([sDim.side[0], sDim.side[sDim.side.length - 1]], fontSize, "DIM", false, true, 0, 0, 2),
            ToDimAlign(eDim.side, fontSize, "DIM", false, false, 0, 0, 1),
            ToDimAlign([eDim.side[0], eDim.side[eDim.side.length - 1]], fontSize, "DIM", false, false, 0, 0, 2)
        );

        result.push(
            ...Layout2D(plan["draw"], plan["dim"], plan["tag"], xOffset, layout["일반도-평면"] * pyOffset, paperScale, 1, "평면도", "", 10, rot) // chang!!!! 0=>rot
        );
        result.push(
            ...Layout2D(side2["draw"], side2["dim"], side2["tag"], xOffset, layout["일반도-측면"] * pyOffset, paperScale, 1, "종단면도", "", 10)
        );
    }

    let ps2 = paperSize[propsDetail.size];
    let paperScale2 = propsDetail ? propsDetail.scale : 1;
    let fontSize2 = 3 * paperScale2;
    let pxOffset2 = ps2.x * paperScale2;
    let pyOffset2 = ps2.y * paperScale2;

    let topWeld = [];
    let bottomWeld = [];
    let sideWeld = [];
    let multiPlot2 = [];

    for (let i in steelBoxDict["children"]) {
        if (steelBoxDict["children"][i]["weld"]) {
            for (let j in steelBoxDict["children"][i]["weld"]) {
                if (steelBoxDict["children"][i]["weld"][j]["topView"]) {
                    topWeld.push(steelBoxDict["children"][i]["weld"][j]);
                }
                if (steelBoxDict["children"][i]["weld"][j]["bottomView"]) {
                    bottomWeld.push(steelBoxDict["children"][i]["weld"][j]);
                }
                if (steelBoxDict["children"][i]["weld"][j]["sideView"]) {
                    sideWeld.push(steelBoxDict["children"][i]["weld"][j]);
                }
            }
        }
    }
    for (let i in steelBoxDict["parent"]) {
        if (steelBoxDict["parent"][i]["weld"]) {
            for (let j in steelBoxDict["parent"][i]["weld"]) {
                if (steelBoxDict["parent"][i]["weld"][j]["topView"]) {
                    topWeld.push(steelBoxDict["parent"][i]["weld"][j]);
                }
                if (steelBoxDict["parent"][i]["weld"][j]["bottomView"]) {
                    bottomWeld.push(steelBoxDict["parent"][i]["weld"][j]);
                }
                if (steelBoxDict["parent"][i]["weld"][j]["sideView"]) {
                    sideWeld.push(steelBoxDict["parent"][i]["weld"][j]);
                }
            }
        }
    }
    for (let my = 0; my < girderNum; my++) {
        let matchLines = ["K1"];
        let sp = 2;
        let spKey = "";
        for (let i = 0; i < girderStations[my].length; i++) {
            spKey = "SP" + sp.toFixed(0);
            if (girderStations[my][i].key.includes(spKey)) {
                matchLines.push(spKey);
                sp += 2;
            }
        }
        matchLines.push("K6");
        let gside = [];
        let gKey = "G" + (my + 1).toFixed(0);
        for (let i in steelBoxDict["children"]) {
            if (steelBoxDict["children"][i]["model"]["sideView"] && steelBoxDict["children"][i]["meta"]["part"].slice(0, 2) === gKey) {
                gside.push(...steelBoxDict["children"][i]["model"]["sideView"]);
            }
        }
        for (let i in mainPartDict) {
            for (let j in mainPartDict[i]["children"]) {
                if (mainPartDict[i]["children"][j]["meta"]["part"].slice(0, 2) === gKey) {
                    if (i !== "xbeam") {
                        gside.push(...GenPartSideDraw(mainPartDict[i]["children"][j]));
                    }
                }
            }
        }
        // for (let i in etcPartDict) {
        //     for (let j in etcPartDict[i]["children"]) {
        //         if (etcPartDict[i]["children"][j]["meta"]["part"].slice(0, 2) === gKey) {
        //             gside.push(...GenPartSideDraw(etcPartDict[i]["children"][j]));
        //         }
        //     }
        // }
        let textLabel = [];
        for (let i in steelBoxDict["children"]) {
            if (steelBoxDict["children"][i]["textLabel"] && steelBoxDict["children"][i]["meta"]["part"].slice(0, 2) === gKey) {
                textLabel.push(steelBoxDict["children"][i]["textLabel"]);
            }
        }

        for (let mx = 0; mx < matchLines.length - 1; mx++) {
            let plan = { draw: [], dim: [], tag: [] };
            let side2 = { draw: [], dim: [], tag: [] };

            let xOffset = (mx + 0.5) * pxOffset2;

            let sKey = matchLines[mx];
            let eKey = matchLines[mx + 1];
            let startKey = gKey + sKey;
            let endKey = gKey + eKey;
            let gLine = girderSplines[my];
            let l1 = LineToOffsetSpline(gLine, -2000, gridPointDict[startKey], gridPointDict[endKey]).points;
            let l2 = LineToOffsetSpline(gLine, 0, gridPointDict[startKey], gridPointDict[endKey]).points;
            let l3 = LineToOffsetSpline(gLine, 2000, gridPointDict[startKey], gridPointDict[endKey]).points;
            let rot = -1 * Math.atan2(l2[l2.length - 1].y - l2[0].y, l2[l2.length - 1].x - l2[0].x);

            let boundaryAll = [...l1, ...l3.reverse()];
            let boundary = [...l1.reverse(), ...l2];
            let boundary2 = [...l2, ...l3];
            if (mx < matchLines.length - 2) {
                plan["draw"].push(...DrawMatchLine([l1[0], l3[0]], fontSize2, "M.L."));
            }
            if (mx > 0) {
                plan["draw"].push(...DrawMatchLine([l1[l1.length - 1], l3[l3.length - 1]], fontSize2, "M.L."));
            }
            plan["draw"].push(...DrawCenterLine(l2, fontSize2, "상부플랜지", "하부플랜지"));
            plan["draw"].push(...Trim2D(top, boundary));
            plan["draw"].push(...Trim2D(bottom, boundary2));
            let startMargin = mx === 0 ? 200 : 0;
            let endMargin = mx === matchLines.length - 2 ? 200 : 0;
            let sideBoundary = [
                { x: gridPointDict[startKey].girderStation - startMargin, y: 0 }, //l2[0].z },
                { x: gridPointDict[endKey].girderStation + endMargin, y: 0 }, //l2[l2.length - 1].z },
                { x: gridPointDict[endKey].girderStation + endMargin, y: -5000 }, //l2[l2.length - 1].z - 5000 },
                { x: gridPointDict[startKey].girderStation - startMargin, y: -5000 },
            ]; //l2[0].z - 5000 }];

            side2["draw"].push(...Trim2D(gside, sideBoundary));

            for (let w in topWeld) {
                let weldProp = topWeld[w]["topView"];
                if (IsPointInPolygon(weldProp.point, boundary, false)) {
                    plan["dim"].push({
                        type: "WELDINGMARK",
                        weldingInput: topWeld[w],
                        weldingInfo: GetWeldingInfo(topWeld[w]),
                        points: [weldProp.point],
                        isUpper: weldProp.isUpper,
                        isRight: weldProp.isRight,
                        isXReverse: weldProp.isXReverse,
                        isYReverse: weldProp.isYReverse,
                    });
                }
            }
            //상부와 하부플랜지의 텍스트 앵커가 중첩되서 나오는 현상을 원천적으로 해결해야함.
            for (let t in textLabel) {
                for (let v in textLabel[t]["topView"]) {
                    let text = textLabel[t]["topView"][v];
                    if (IsPointInPolygon(text.anchor, boundaryAll, false)) {
                        plan["draw"].push(new Text(text.anchor, text.text, fontSize2, -rot, "center", "CZ-TEX0"));
                    }
                }
                for (let v in textLabel[t]["bottomView"]) {
                    let text = textLabel[t]["bottomView"][v];
                    if (IsPointInPolygon(text.anchor, boundaryAll, false)) {
                        plan["draw"].push(new Text(text.anchor, text.text, fontSize2, -rot, "center", "CZ-TEX0"));
                    }
                }
                for (let v in textLabel[t]["sideView"]) {
                    let text = textLabel[t]["sideView"][v];
                    if (IsPointInPolygon(text.anchor, sideBoundary, false)) {
                        side2["draw"].push(new Text(text.anchor, text.text, fontSize2, 0, "center", "  CZ-TEX0"));
                    }
                }
            }

            for (let w in bottomWeld) {
                let weldProp = bottomWeld[w]["bottomView"];
                if (IsPointInPolygon(weldProp.point, boundary2, false)) {
                    // let weldPoint = PointToDraw(weldProp.point, 1, initPoint, rot, 0, 0, xOffset, yOffset);
                    plan["dim"].push({
                        type: "WELDINGMARK",
                        weldingInput: bottomWeld[w],
                        weldingInfo: GetWeldingInfo(bottomWeld[w]),
                        points: [weldProp.point],
                        isUpper: weldProp.isUpper,
                        isRight: weldProp.isRight,
                        isXReverse: weldProp.isXReverse,
                        isYReverse: weldProp.isYReverse,
                    });
                }
            }
            let bool = false;
            let weldingMarkDict = {};
            for (let j in girderStations[my]) {
                let key = girderStations[my][j].key;
                if (key.includes(sKey)) {
                    bool = true;
                }
                let part = _.find(steelBoxDict["parent"], { part: key });
                if (part) {
                    if (bool && part["weld"]) {
                        for (let w in part.weld) {
                            let weldKey = part.weld[w].type + part.weld[w].thickness1.toString() + part.weld[w].thickness2.toString();
                            if (!weldingMarkDict.hasOwnProperty(weldKey)) {
                                weldingMarkDict[weldKey] = [part.weld[w]];
                            } else {
                                weldingMarkDict[weldKey].push(part.weld[w]);
                            }
                        }
                    }
                }
                if (key.includes(eKey)) {
                    bool = false;
                }
            }
            let mark = "ABCDEFGHIJKLMNOP";
            let wm = "";
            let bool2 = true;
            Object.values(weldingMarkDict).forEach(function (value, i) {
                bool2 = true;
                value.forEach(function (elem) {
                    if (elem["sideView"]) {
                        let weldProp = elem["sideView"];
                        if (bool2) {
                            wm = mark[i];
                            bool2 = false;
                        } else {
                            wm = "";
                        }
                        side2["dim"].push({
                            type: "WELDINGMARK",
                            weldingInput: elem,
                            weldingInfo: GetWeldingInfo(elem),
                            points: [weldProp.point],
                            isUpper: weldProp.isUpper,
                            isRight: weldProp.isRight,
                            isXReverse: weldProp.isXReverse,
                            isYReverse: weldProp.isYReverse,
                            mark: wm,
                        });
                    }
                });
            });
            //용접상세
            let c = 0;
            let totalC = Object.keys(weldingMarkDict).length;
            let cOffset = (ps.x * paperScale2) / (totalC + 2);
            for (let i in weldingMarkDict) {
                //dxf 오류발생지점
                weldingMarkDict[i][0];
                result.push(
                    ...GenWeldingDetailDraw(
                        weldingMarkDict[i][0],
                        paperScale2,
                        mark[c],
                        xOffset + (c - (totalC - 1) / 2) * cOffset,
                        -(my + 1) * pyOffset2 + 0.1 * pyOffset2
                    )
                );
                c++;
            }

            let dimTopPoints = [];
            let dimSidePoints = [];
            let startI = 0;
            let endI = 0;

            for (let j = 0; j < girderStations[my].length; j++) {
                let gridObj = girderStations[my][j];
                dimTopPoints.push(gridObj.point);
                dimSidePoints.push({
                    x: gridObj.point.girderStation,
                    y: 0,
                    normalCos: 0,
                    normalSin: -1,
                    mainStation: gridObj.point.mainStation,
                    girderStation: gridObj.point.girderStation,
                });
                if (gridObj.key === startKey) {
                    startI = j;
                } else if (gridObj.key === endKey) {
                    endI = j;
                }
            }
            //gridPoint mark
            for (let j = 0; j < girderStations[my].length; j++) {
                let gridObj = girderStations[my][j];
                if (j >= startI && j <= endI) {
                    //marker
                    if (gridObj.key.includes("V") || gridObj.key.includes("D") || gridObj.key.includes("SP") || gridObj.key.includes("F")) {
                        //station.substr(0,2)==="G1" &&
                        let markTop = 0;
                        if (gridObj.key.substr(2, 1) === "V" || gridObj.key.substr(2, 1) === "D") {
                            markTop = 2 * fontSize2;
                        }
                        let cos = gridObj.point.normalCos;
                        let sin = gridObj.point.normalSin;
                        let localRot = Math.atan2(cos, -sin);

                        let position = PointToDraw(gridObj.point, 1, { x: 0, y: 0 }, 0, 0, 2000 + markTop, 0, 0);
                        let position2 = PointToDraw({ x: gridObj.point.girderStation, y: 0 }, 1, { x: 0, y: 0 }, 0, 0, 1000 + markTop, 0, 0);
                        plan["draw"].push(
                            new Line(GetRoundedRect(position.x, position.y, localRot, fontSize2 * 4, 2 * fontSize2, fontSize2), "RED", true, null)
                        );
                        plan["draw"].push(new Text(position, idNameDict[gridObj.key] ?? gridObj.key, fontSize2, localRot, "center", "CZ-TEX0"));
                        side2["draw"].push(
                            new Line(GetRoundedRect(position2.x, position2.y, 0, fontSize2 * 4, 2 * fontSize2, fontSize2), "RED", true, null)
                        );
                        side2["draw"].push(new Text(position2, idNameDict[gridObj.key] ?? gridObj.key, fontSize2, 0, "center", "CZ-TEX0"));
                    }
                }
            }

            let dimTitle = [
                { name: "총 길이", splicer: [], offsetIndex: 4, offset: 2000 },
                { name: "현장이음", splicer: ["SP"], offsetIndex: 3, offset: 2000 },
                { name: "상판공장이음", splicer: ["SP", "TF"], offsetIndex: 2, offset: 2000 },
                { name: "다이아프램", splicer: ["D"], offsetIndex: 4, offset: -2000 },
                { name: "현장이음", splicer: ["SP"], offsetIndex: 3, offset: -2000 },
                { name: "하판공장이음", splicer: ["SP", "BF"], offsetIndex: 2, offset: -2000 },
            ];
            for (let dims of dimTitle) {
                let dimIndex = [];
                let subText = [];
                let splicer = dims.splicer;
                let dy = dims.offset >= 0 ? 9 * paperScale2 : -9 * paperScale2;
                let cOffset = dims.offset + dims.offsetIndex * dy;
                for (let j = 0; j < girderStations[my].length; j++) {
                    let gridObj = girderStations[my][j];
                    let bool = false; //노드가 구분자일 경우 true를 반환
                    if (j === 0 || j === girderStations[my].length - 1) {
                        bool = true;
                    }
                    splicer.forEach(s => (bool = gridObj.key.includes(s) ? true : bool));
                    if (bool) {
                        dimIndex.push(j);
                        if (splicer.includes("TF") || splicer.includes("BF") || splicer.includes("WF")) {
                            let thickness = 0;
                            if (splicer.includes("TF")) {
                                thickness = sectionPointDict[gridObj.key].forward.input.tuf;
                            } else if (splicer.includes("BF")) {
                                thickness = sectionPointDict[gridObj.key].forward.input.tlf;
                            } else if (splicer.includes("WF")) {
                                thickness = sectionPointDict[gridObj.key].forward.input.tw;
                            }
                            subText.push("(T=" + thickness.toString() + "mm)");
                        }
                    }
                }
                //20220602 거더중심선 치수선 거리로 테스트 필요
                plan["draw"].push(...GenPlanDim(dimTopPoints, dimIndex, startI, endI, paperScale2, dims["name"], cOffset, dy, subText, true));
            }
            let dimTitle3 = [
                { name: "총 길이", splicer: [], offsetIndex: 4, offset: 1000 },
                { name: "현장이음", splicer: ["SP"], offsetIndex: 3, offset: 1000 },
                { name: "복부판공장이음", splicer: ["SP", "WF"], offsetIndex: 2, offset: 1000 },
                { name: "하부콘크리트", splicer: ["LC"], offsetIndex: 1, offset: -3500 },
                { name: "수직보강재", splicer: ["D", "V"], offsetIndex: 0, offset: -3500 },
            ];
            for (let dims of dimTitle3) {
                let dimIndex = [];
                let splicer = dims.splicer;
                let dy = dims.offset >= 0 ? 9 * paperScale2 : -9 * paperScale2;
                let cOffset = dims.offset + dims.offsetIndex * dy;
                for (let j = 0; j < girderStations[my].length; j++) {
                    let gridObj = girderStations[my][j];
                    let bool = false; //노드가 구분자일 경우 true를 반환
                    if (j === 0 || j === girderStations[my].length - 1) {
                        bool = true;
                    }
                    splicer.forEach(s => (bool = gridObj.key.includes(s) ? true : bool));
                    if (bool) {
                        dimIndex.push(j);
                    }
                }
                side2["draw"].push(...GenPlanDim(dimSidePoints, dimIndex, startI, endI, paperScale2, dims["name"], cOffset, dy, [], true));
            }

            let srot = Math.atan2(dimTopPoints[startI].normalCos, -dimTopPoints[startI].normalSin) + rot;
            let erot = Math.atan2(dimTopPoints[endI].normalCos, -dimTopPoints[endI].normalSin) + rot;
            let sDim = GetVerticalDimPoints(sectionPointDict, [girderStations[my]], sKey, 0);
            let eDim = GetVerticalDimPoints(sectionPointDict, [girderStations[my]], eKey, 0);
            plan["dim"].push(
                ToDimAlign(sDim.plan, fontSize, "DIM", false, true, srot, 0, 1),
                ToDimAlign([sDim.plan[0], sDim.plan[sDim.plan.length - 1]], fontSize, "DIM", false, true, srot, 0, 2),
                ToDimAlign(eDim.plan, fontSize, "DIM", false, false, erot, 0, 1),
                ToDimAlign([eDim.plan[0], eDim.plan[eDim.plan.length - 1]], fontSize, "DIM", false, false, erot, 0, 2)
            );

            side2["dim"].push(
                ToDimAlign(sDim.side, fontSize, "DIM", false, true, 0, 0, 1),
                ToDimAlign([sDim.side[0], sDim.side[sDim.side.length - 1]], fontSize, "DIM", false, true, 0, 0, 2),
                ToDimAlign(eDim.side, fontSize, "DIM", false, false, 0, 0, 1),
                ToDimAlign([eDim.side[0], eDim.side[eDim.side.length - 1]], fontSize, "DIM", false, false, 0, 0, 2)
            );

            result.push(
                ...Layout2D(
                    plan["draw"],
                    plan["dim"],
                    plan["tag"],
                    xOffset,
                    layout["상세도-평면"] * pyOffset2 - (my + 1) * pyOffset2,
                    paperScale2,
                    1,
                    "평면도",
                    "",
                    10,
                    rot
                )
            );
            result.push(
                ...Layout2D(
                    side2["draw"],
                    side2["dim"],
                    side2["tag"],
                    xOffset,
                    layout["상세도-측면"] * pyOffset2 - (my + 1) * pyOffset2,
                    paperScale2,
                    1,
                    "종단면도",
                    "",
                    10
                )
            );

            result.push(
                ...DrawGirderMiniMap(
                    girderStations,
                    steelBoxDict,
                    my + 1,
                    my + 1,
                    15 * paperScale2 + mx * pxOffset2,
                    (ps2.y - 15) * paperScale2 - (my + 1) * pyOffset2,
                    paperScale2 / 1500,
                    fontSize2,
                    boundaryAll
                )
            );
        }
        multiPlot2.push({ yOffset: -(1 + my) * pyOffset2, num: matchLines.length - 1, title: "강상형 상세도" });
    }
    let multiPlot = [{ yOffset: 0, num: matchLines.length - 1, title: "강상형 일반도" }];
    result.push(...Plot2D(propsGeneral, multiPlot));
    result.push(...Plot2D(propsDetail, multiPlot2));
    return result;
}

function GenPlanDim(dimPoints, dimIndex, startI, endI, paperScale, dimTitle, offset, dy, subText = [], isGirder = false) {
    let origin = { x: 0, y: 0 };
    let result = [];
    let dimLine = dimPoints.slice(startI, endI + 1);
    let newDimLine = PointToDraw(dimLine, 1, origin, 0, 0, offset, 0, 0);
    result.push(new Line(newDimLine, "DIM", false, null));
    let rotation = Math.atan2(dimLine[0].normalCos, -dimLine[0].normalSin);
    let pt0 = PointToDraw(dimLine[0], 1, origin, 0, -30 * paperScale, offset, 0, 0);
    let anchor = PointToDraw(dimLine[0], 1, origin, 0, -30 * paperScale, offset + 2.5 * paperScale, 0, 0);
    result.push(new Text(anchor, dimTitle, paperScale * 3, rotation, "left", "CZ-TEX0"));
    result.push(new Line([pt0, newDimLine[0]], "DIM", false, null));
    for (let i = 0; i < dimIndex.length - 1; i++) {
        if (startI < dimIndex[i + 1] && dimIndex[i] < endI) {
            let st = dimPoints[dimIndex[i]];
            let ed = dimPoints[dimIndex[i + 1]];
            if (dimIndex[i] < startI && dimIndex[i + 1] > startI) {
                st = dimPoints[startI];
            }
            if (dimIndex[i] < endI && dimIndex[i + 1] > endI) {
                ed = dimPoints[endI];
            }
            let dimProp = splineProp(st, ed);
            if (dimProp.length > 0) {
                let position = PointToDraw(dimProp.midPoint, 1, origin, 0, 0, offset + 2.5 * paperScale, 0, 0); //fontSize에 대한 값을 scale 적용않고 정의
                let position2 = PointToDraw(dimProp.midPoint, 1, origin, 0, 0, offset - 2.5 * paperScale, 0, 0); //fontSize에 대한 값을 scale 적용않고 정의
                let dimSize = isGirder
                    ? dimPoints[dimIndex[i + 1]].girderStation - dimPoints[dimIndex[i]].girderStation
                    : dimPoints[dimIndex[i + 1]].mainStation - dimPoints[dimIndex[i]].mainStation; //splineProp(p1, p2) //거더의 총길이의 경우 곡선부일 때 오차가 날 가능성이 있음 21.01.15 byDrLim
                let rot = Math.atan2(dimProp.midPoint.normalCos, -dimProp.midPoint.normalSin);
                result.push(new Text(position, dimSize.toFixed(0), paperScale * 3, rot, "center", "CZ-TEX0"));
                if (subText) {
                    if (subText[i]) {
                        result.push(new Text(position2, subText[i], paperScale * 3, rot, "center", "CZ-TEX0"));
                    }
                }
            }
        }
    }

    for (let i = 0; i < dimIndex.length; i++) {
        if (startI <= dimIndex[i] && dimIndex[i] <= endI) {
            let pt1 = PointToDraw(dimPoints[dimIndex[i]], 1, origin, 0, 0, offset, 0, 0);
            let pt2 = PointToDraw(dimPoints[dimIndex[i]], 1, origin, 0, 0, offset - dy, 0, 0);
            result.push(new Line([pt1, pt2], "DIM", false, null));
        }
    }
    return result;
}

function GetVerticalDimPoints(sectionPointDict, girderStation, sKey, sideGirderIndex, isDetail = false) {
    //그리드 마크와 보조선 그리기 + 치수선도 포함해서 그릭기
    let uflangePoint = [];
    let pts = [];
    let subList = [];
    let subList2 = [];
    for (let i = 0; i < girderStation.length; i++) {
        for (let j in girderStation[i]) {
            let key = girderStation[i][j].key;
            if (key.includes(sKey)) {
                let pt = girderStation[i][j].point;
                pts.push(pt);
                let uflange = sectionPointDict[key]["forward"].uflange;
                for (let k in uflange) {
                    if (uflange[k].length > 0) {
                        subList.push(uflange[k][0], uflange[k][1]);
                    }
                }
                if (isDetail) {
                    subList.push(sectionPointDict[key]["forward"].web[0][1], sectionPointDict[key]["forward"].web[1][1]);
                }
                subList.sort(function (a, b) {
                    return a.x < b.x ? -1 : 1;
                });
                let ufPts = PointToGlobal(subList, GetRefPoint(pt));
                uflangePoint.push(...ufPts);
                // for (let k in subList) {
                //     uflangePoint.push(ToGlobalPoint(pt, subList[k]));
                // }
            }
        }
    }
    for (let j in girderStation[sideGirderIndex]) {
        let key = girderStation[sideGirderIndex][j].key;
        if (key.includes(sKey)) {
            let pt = girderStation[sideGirderIndex][j].point;
            let uflangeSide = sectionPointDict[key]["forward"].uflangeSide;
            let lflangeSide = sectionPointDict[key]["forward"].lflangeSide;
            subList2.push(
                { x: pt.girderStation, y: uflangeSide[1], z: 0 },
                { x: pt.girderStation, y: uflangeSide[0], z: 0 },
                { x: pt.girderStation, y: lflangeSide[0], z: 0 },
                { x: pt.girderStation, y: lflangeSide[1], z: 0 }
            );
        }
    }
    return { plan: uflangePoint, side: subList2 };
}
