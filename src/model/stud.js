import { PointToGlobal, TwoPointsLength } from "@nexivil/package-modules";
import { GenBTConcStudGeometry, GenStudGeometry } from "./geometry";

export function GenStudModelFn(girderStations, sectionPointDict, topStudInfo, bottomStudInfo) {
    const studInfo = topStudInfo.studInfo;
    const topPlateStudLayout = topStudInfo.layout;

    // let studDict = {};
    let studList = [];
    let segIndex = {};
    for (let i in topPlateStudLayout) {
        let ts = {
            start: topPlateStudLayout[i][0],
            end: topPlateStudLayout[i][1],
            startOffset: topPlateStudLayout[i][2],
            endOffset: topPlateStudLayout[i][3],
            spacing: topPlateStudLayout[i][4],
            layout: topPlateStudLayout[i][5],
        };
        const sp = ts.start;
        let girderIndex = sp.substr(1, 1) * 1 - 1;
        if (segIndex.hasOwnProperty(girderIndex)) {
            if (sp.includes("SP")) {
                segIndex[girderIndex] += 1;
            }
        } else {
            segIndex[girderIndex] = 1;
        }

        let gridKeys = [];
        let gridPoints = [];
        let cr = false;
        let dummyStation = Infinity;
        for (let j in girderStations[girderIndex]) {
            if (girderStations[girderIndex][j].key === ts.start) {
                cr = true;
            }
            if (dummyStation !== girderStations[girderIndex][j].station) {
                if (cr) {
                    gridKeys.push(girderStations[girderIndex][j].key);
                    gridPoints.push(girderStations[girderIndex][j].point);
                }
            }
            if (girderStations[girderIndex][j].key === ts.end) {
                cr = false;
            }
            //
            if (cr) {
                dummyStation = girderStations[girderIndex][j].station;
            }
        }
        let totalLength = 0;
        let segLength = 0;
        // let gradientY = 0;

        for (let j = 0; j < gridKeys.length - 1; j++) {
            // let isOpen = false;
            let points = [];
            let sidePoints = [];
            let spts = [];
            let epts = [];
            let sideStartY = sectionPointDict[gridKeys[j]].forward.uflangeSide[1];
            let sideEndY = sectionPointDict[gridKeys[j + 1]].backward.uflangeSide[1];

            for (let p = 0; p < 3; p++) {
                let startFlangePoints = sectionPointDict[gridKeys[j]].forward.uflange[p];
                let endFlangePoints = sectionPointDict[gridKeys[j + 1]].backward.uflange[p];
                if (startFlangePoints.length > 0 && endFlangePoints.length > 0) {
                    let startNode = startFlangePoints[3];
                    let endNode = endFlangePoints[3];
                    let startW = Math.abs(startFlangePoints[3].x - startFlangePoints[2].x);
                    let endW = Math.abs(endFlangePoints[3].x - endFlangePoints[2].x);
                    let sign = p === 1 ? -1 : 1;
                    // 효명 스터드배치를 위한 임시코드 ==>
                    if (p < 2) {
                        //개구형 구간의 경우
                        let dx = [
                            studInfo.edgeDistance,
                            studInfo.edgeDistance + studInfo.distance,
                            studInfo.edgeDistance + 2 * studInfo.distance,
                            (studInfo.edgeDistance + 2 * studInfo.distance) * 0.6 + (startW - studInfo.edgeDistance) * 0.4,
                            startW - studInfo.edgeDistance,
                        ];
                        let dx2 = [
                            studInfo.edgeDistance,
                            studInfo.edgeDistance + studInfo.distance,
                            studInfo.edgeDistance + 2 * studInfo.distance,
                            (studInfo.edgeDistance + 2 * studInfo.distance) * 0.6 + (endW - studInfo.edgeDistance) * 0.4,
                            endW - studInfo.edgeDistance,
                        ];
                        for (let k = 0; k < 5; k++) {
                            spts.push({ x: startNode.x + sign * dx[k], y: startNode.y + sign * dx[k] * gridPoints[j].gradientY });
                            epts.push({ x: endNode.x + sign * dx2[k], y: endNode.y + sign * dx2[k] * gridPoints[j + 1].gradientY });
                        }
                    } else {
                        //박스구간인 경우
                        let startNode2 = startFlangePoints[2];
                        let endNode2 = endFlangePoints[2];
                        let dx = [
                            studInfo.edgeDistance,
                            studInfo.edgeDistance + studInfo.distance,
                            studInfo.edgeDistance + 2 * studInfo.distance,
                            (startW / 2) * 0.4 + (studInfo.edgeDistance + 2 * studInfo.distance) * 0.6,
                            (startW / 2) * 0.8 + (studInfo.edgeDistance + 2 * studInfo.distance) * 0.2,
                        ];
                        let dx2 = [
                            studInfo.edgeDistance,
                            studInfo.edgeDistance + studInfo.distance,
                            studInfo.edgeDistance + 2 * studInfo.distance,
                            (endW / 2) * 0.4 + (studInfo.edgeDistance + 2 * studInfo.distance) * 0.6,
                            (endW / 2) * 0.8 + (studInfo.edgeDistance + 2 * studInfo.distance) * 0.2,
                        ];
                        for (let k = 0; k < 5; k++) {
                            spts.push({ x: startNode.x + dx[k], y: startNode.y + dx[k] * gridPoints[j].gradientY });
                            spts.push({ x: startNode2.x - dx[k], y: startNode2.y - dx[k] * gridPoints[j].gradientY });
                            epts.push({ x: endNode.x + dx2[k], y: endNode.y + dx2[k] * gridPoints[j + 1].gradientY });
                            epts.push({ x: endNode2.x - dx2[k], y: endNode2.y - dx2[k] * gridPoints[j + 1].gradientY });
                        }
                    }
                }
            }

            spts.sort(function (a, b) {
                return a.x < b.x ? -1 : 1;
            });
            epts.sort(function (a, b) {
                return a.x < b.x ? -1 : 1;
            });

            let globalSpts = [];
            let globalEpts = [];

            spts.forEach(function (elem) {
                globalSpts.push(PointToGlobal(elem, gridPoints[j]));
            });
            epts.forEach(function (elem) {
                globalEpts.push(PointToGlobal(elem, gridPoints[j + 1]));
            });
            let sideSpt = { x: gridPoints[j].girderStation, y: sideStartY, z: 0 };
            let sideEpt = { x: gridPoints[j + 1].girderStation, y: sideEndY, z: 0 };

            segLength = Math.max(
                Math.sqrt((globalSpts[0].x - globalEpts[0].x) ** 2 + (globalSpts[0].y - globalEpts[0].y) ** 2),
                Math.sqrt(
                    (globalSpts[globalSpts.length - 1].x - globalEpts[globalEpts.length - 1].x) ** 2 +
                        (globalSpts[globalSpts.length - 1].y - globalEpts[globalEpts.length - 1].y) ** 2
                )
            );

            totalLength += segLength;
            let remainder = (totalLength - ts.startOffset) % ts.spacing;
            let sNum = segLength - remainder > 0 ? Math.floor((segLength - remainder) / ts.spacing) + 1 : 0;
            let x = 0;
            for (let k = 0; k < sNum; k++) {
                if (j < gridKeys.length - 2 || k > 0) {
                    x = remainder + k * ts.spacing;
                } else {
                    x = ts.endOffset;
                }
                let tempPoints = [];
                for (let l = 0; l < spts.length; l++) {
                    // 항상 10개가 나올 것임.
                    tempPoints.push({
                        x: (x / segLength) * globalSpts[l].x + ((segLength - x) / segLength) * globalEpts[l].x,
                        y: (x / segLength) * globalSpts[l].y + ((segLength - x) / segLength) * globalEpts[l].y,
                        z: (x / segLength) * globalSpts[l].z + ((segLength - x) / segLength) * globalEpts[l].z,
                    });
                }
                points.push(tempPoints[0]);
                for (let t = 0; t < tempPoints.length - 1; t++) {
                    if (TwoPointsLength(tempPoints[t], tempPoints[t + 1]) > studInfo.distance * 0.99) {
                        points.push(tempPoints[t + 1]);
                    }
                }

                sidePoints.push({
                    x: (x / segLength) * sideSpt.x + ((segLength - x) / segLength) * sideEpt.x,
                    y: (x / segLength) * sideSpt.y + ((segLength - x) / segLength) * sideEpt.y,
                    z: (x / segLength) * sideSpt.z + ((segLength - x) / segLength) * sideEpt.z,
                });
            }
            let groupName = "G" + (girderIndex + 1).toString() + "SEG" + segIndex[girderIndex].toString();
            if (points.length > 0) {
                studList.push({
                    girder: girderIndex + 1,
                    seg: segIndex[girderIndex],
                    type: "stud",
                    meta: {
                        material: "Bolt",
                        part: groupName,
                        key: gridKeys[j] + gridKeys[j + 1],
                        girder: girderIndex + 1,
                        seg: segIndex[girderIndex],
                    },
                    category: "topFlange",
                    points: points,
                    rotX: 0,
                    rotY: 0,
                    rotZ: 0,
                    stud: studInfo,
                    get threeFunc() {
                        return InitPoint => GenStudGeometry(this.rotX, this.rotY, this.rotZ, this.points, this.stud, InitPoint);
                    },
                    model: {
                        sideView: sidePoints,
                    },
                });
            }
        }
    }

    let bottomStud = GenBottomStudModel(girderStations, sectionPointDict, bottomStudInfo);
    studList.push(...bottomStud.model);
    let model = {
        parent: [
            {
                name: "stud",
                properties: {
                    H: studInfo.height,
                    D: studInfo.dia,
                    nB: 10,
                    nP: 3,
                    t: 100,
                    shMin: 100,
                    svB: 450,
                    svP: 450,
                },
            },
            {
                name: "stud2",
                properties: {
                    H: 100,
                    D: 22,
                    n: 12,
                    shMin: 75,
                    sv: 450,
                },
            },
        ],
        children: studList,
        dimension: bottomStud.dimension,
        section: bottomStud.section,
    };

    return { model };
}

function GenBottomStudModel(girderStations, sectionPointDict, bottomStudData) {
    //1차적으로는 station을 기준으로 배치하고 향후 옵션(곡선교에 대한)을 추가해서, 실간격을 반영할지 여부를 판단할 것임.
    let studModels = [];
    let studDict = {};
    let section = [];
    let dimension = [];
    const studInfo = bottomStudData.studInfo;
    const layout = bottomStudData.layout;
    const sideLayout = bottomStudData.sideLayout;
    const diaPhragmLayout = bottomStudData.diaPhragmLayout;

    let studPoints = [];
    for (let i in girderStations) {
        let cr = false;
        let subGrid = [];
        let girder = i * 1 + 1;
        let seg = 1;
        let span = 0;
        for (let j in girderStations[i]) {
            let key = girderStations[i][j].key;
            let point = girderStations[i][j].point;
            let bool = ["D", "V", "SP"].some(el => key.includes(el));
            if (key.includes("SP")) {
                seg += 1;
            }
            if (!key.includes("SP") && key.includes("S")) {
                span += 1;
            }
            if (sectionPointDict[key].backward.input.Tcl === 0 && sectionPointDict[key].forward.input.Tcl > 0) {
                cr = true;
            }
            if (bool && cr) {
                subGrid.push({ girder, seg, span, key, point });
            }
            if (cr && bool && sectionPointDict[key].forward.input.Tcl === 0) {
                cr = false;
                studPoints.push(subGrid);
                subGrid = [];
            }
        }
    }
    for (let i in studPoints) {
        let segLength = 0;
        let partName = "G" + studPoints[i][0].girder.toString() + "lConc" + String(i * 1 + 1);
        let leftDimPoints = [];
        let rightDimPoints = [];
        let startDimPoints = [];
        let endDimPoints = [];
        let sideDimPoints = [];
        let sectionView = [];
        let leftSectionDimPoints = [];
        let rightSectionDimPoints = [];
        let bottomSectionDimPoints = [];
        for (let j = 0; j < studPoints[i].length - 1; j++) {
            let points = [];
            let sidePoints = [];
            let dsSidePoints = [];
            let deSidePoints = [];
            let rwSidePoints = [];
            let leftPoints = [];
            let rightPoints = [];
            let spts = [];
            let epts = [];
            let lspts = [];
            let rspts = [];
            let lepts = [];
            let repts = [];
            let dspts = []; //다이아프램 스터드
            let depts = []; //다이아프램 스터드
            let skey = studPoints[i][j].key;
            let ekey = studPoints[i][j + 1].key;
            let startPoint = studPoints[i][j].point;
            let endPoint = studPoints[i][j + 1].point;

            let startLefttan =
                (sectionPointDict[skey].forward.web[0][1].x - sectionPointDict[skey].forward.web[0][0].x) /
                (sectionPointDict[skey].forward.web[0][1].y - sectionPointDict[skey].forward.web[0][0].y);
            let startRighttan =
                (sectionPointDict[skey].forward.web[1][1].x - sectionPointDict[skey].forward.web[1][0].x) /
                (sectionPointDict[skey].forward.web[1][1].y - sectionPointDict[skey].forward.web[1][0].y);
            let endLefttan =
                (sectionPointDict[ekey].backward.web[0][1].x - sectionPointDict[ekey].backward.web[0][0].x) /
                (sectionPointDict[ekey].backward.web[0][1].y - sectionPointDict[ekey].backward.web[0][0].y);
            let endRighttan =
                (sectionPointDict[ekey].backward.web[1][1].x - sectionPointDict[ekey].backward.web[1][0].x) /
                (sectionPointDict[ekey].backward.web[1][1].y - sectionPointDict[ekey].backward.web[1][0].y);

            let lRad = Math.atan(startLefttan);
            let rRad = Math.atan(startRighttan);
            let rot =
                Math.atan2(studPoints[i][j + 1].point.y - studPoints[i][j].point.y, studPoints[i][j + 1].point.x - studPoints[i][j].point.x) -
                Math.PI / 2;
            let rot1 = Math.atan2(studPoints[i][j].point.normalSin, studPoints[i][j].point.normalCos);
            let rot2 = Math.atan2(studPoints[i][j + 1].point.normalSin, studPoints[i][j + 1].point.normalCos);

            let startLeftPoint = sectionPointDict[skey].forward.web[0][0];
            let startRightPoint = sectionPointDict[skey].backward.web[1][0];
            let endLeftPoint = sectionPointDict[ekey].forward.web[0][0];
            let endRightPoint = sectionPointDict[ekey].backward.web[1][0];
            let sideStartY = sectionPointDict[skey].forward.lflangeSide[0];
            let sideEndY = sectionPointDict[ekey].backward.lflangeSide[0];

            for (let l in layout) {
                spts.push({ x: startLeftPoint.x + layout[l], y: startLeftPoint.y });
                spts.push({ x: startRightPoint.x - layout[l], y: startRightPoint.y });
                epts.push({ x: endLeftPoint.x + layout[l], y: endLeftPoint.y });
                epts.push({ x: endRightPoint.x - layout[l], y: endRightPoint.y });
                if (skey.includes("D")) {
                    dspts.push({ x: startLeftPoint.x + layout[l], y: startLeftPoint.y + diaPhragmLayout });
                    dspts.push({ x: startRightPoint.x - layout[l], y: startRightPoint.y + diaPhragmLayout });
                }
                if (ekey.includes("D")) {
                    depts.push({ x: endLeftPoint.x + layout[l], y: endLeftPoint.y + diaPhragmLayout });
                    depts.push({ x: endRightPoint.x - layout[l], y: endRightPoint.y + diaPhragmLayout });
                }
            }
            dspts.sort(function (a, b) {
                return a.x > b.x ? 1 : -1;
            });
            depts.sort(function (a, b) {
                return a.x > b.x ? 1 : -1;
            });
            for (let l in sideLayout) {
                let h1 = sectionPointDict[skey].forward.input.Tcl - sideLayout[l];
                let h2 = sectionPointDict[ekey].backward.input.Tcl - sideLayout[l];
                lspts.push({ x: startLeftPoint.x + h1 * startLefttan, y: startLeftPoint.y + h1, h: h1 });
                rspts.push({ x: startRightPoint.x + h1 * startRighttan, y: startRightPoint.y + h1, h: h1 });
                lepts.push({ x: endLeftPoint.x + h2 * endLefttan, y: endLeftPoint.y + h2, h: h2 });
                repts.push({ x: endRightPoint.x + h2 * endRighttan, y: endRightPoint.y + h2, h: h2 });
            }

            let globalSpts = [];
            let globalEpts = [];
            let dGlobalSpts = [];
            let dGlobalEpts = [];

            spts.forEach(function (elem) {
                globalSpts.push(PointToGlobal(elem, studPoints[i][j].point));
            });
            epts.forEach(function (elem) {
                globalEpts.push(PointToGlobal(elem, studPoints[i][j + 1].point));
            });
            dspts.forEach(function (elem) {
                dGlobalSpts.push(PointToGlobal(elem, studPoints[i][j].point));
            });
            depts.forEach(function (elem) {
                dGlobalEpts.push(PointToGlobal(elem, studPoints[i][j + 1].point));
            });
            dsSidePoints.push({ x: studPoints[i][j].point.girderStation, y: sideStartY + diaPhragmLayout, z: 0 });
            deSidePoints.push({ x: studPoints[i][j + 1].point.girderStation, y: sideEndY + diaPhragmLayout, z: 0 });

            let leftGlobalSpts = [];
            let leftGlobalEpts = [];
            let rightGlobalSpts = [];
            let rightGlobalEpts = [];
            lspts.forEach(function (elem) {
                leftGlobalSpts.push({ ...PointToGlobal(elem, studPoints[i][j].point), h: elem.h });
            });
            lepts.forEach(function (elem) {
                leftGlobalEpts.push({ ...PointToGlobal(elem, studPoints[i][j + 1].point), h: elem.h });
            });
            rspts.forEach(function (elem) {
                rightGlobalSpts.push({ ...PointToGlobal(elem, studPoints[i][j].point), h: elem.h });
            });
            repts.forEach(function (elem) {
                rightGlobalEpts.push({ ...PointToGlobal(elem, studPoints[i][j + 1].point), h: elem.h });
            });

            let sideSpt = { x: studPoints[i][j].point.girderStation, y: sideStartY, z: 0 };
            let sideEpt = { x: studPoints[i][j + 1].point.girderStation, y: sideEndY, z: 0 };

            let startOffset = studInfo.endOffset;
            let endOffset = studInfo.endOffset;
            if (skey.includes("SP")) {
                startOffset = studInfo.spliceOffset;
            }
            if (ekey.includes("SP")) {
                endOffset = studInfo.spliceOffset;
            }
            // if (j === 0) {
            //     leftDimPoints.push({
            //         x: leftGlobalSpts[0].x,
            //         y: leftGlobalSpts[0].y,
            //         z: 0,
            //         normalCos: Math.cos(rot1),
            //         normalSin: Math.sin(rot1),
            //     });
            //     rightDimPoints.push({
            //         x: rightGlobalSpts[0].x,
            //         y: rightGlobalSpts[0].y,
            //         z: 0,
            //         normalCos: Math.cos(rot1),
            //         normalSin: Math.sin(rot1),
            //     });
            //     startDimPoints.push({
            //         ...pointtog(studPoints[i][j].point, sectionPointDict[skey].forward.web[0][0]),
            //         z: 0,
            //         normalCos: -Math.sin(rot1),
            //         normalSin: Math.cos(rot1),
            //     });
            //     dGlobalSpts.forEach(pt => startDimPoints.push({ ...pt, z: 0, normalCos: -Math.sin(rot1), normalSin: Math.cos(rot1) }));
            //     startDimPoints.push({
            //         ...pointtog(studPoints[i][j].point, sectionPointDict[skey].forward.web[1][0]),
            //         z: 0,
            //         normalCos: -Math.sin(rot1),
            //         normalSin: Math.cos(rot1),
            //     });
            //     sideDimPoints.push({
            //         x: studPoints[i][j].point.girderStation,
            //         y: sideSpt.y,
            //         z: 0,
            //         normalCos: 0,
            //         normalSin: 1,
            //     });
            //     leftSectionDimPoints.push({ x: startLeftPoint.x, y: startLeftPoint.y, normalCos: 1, normalSin: 0 });
            //     lspts.forEach(pt => leftSectionDimPoints.push({ x: startLeftPoint.x, y: pt.y, normalCos: 1, normalSin: 0 }));
            //     leftSectionDimPoints.push({
            //         x: startLeftPoint.x,
            //         y: startLeftPoint.y + sectionPointDict[skey].forward.input.Tcl,
            //         normalCos: 1,
            //         normalSin: 0,
            //     });
            //     rightSectionDimPoints.push({ x: startRightPoint.x, y: startRightPoint.y, normalCos: 1, normalSin: 0 });
            //     if (dspts.length > 0) {
            //         rightSectionDimPoints.push({ x: startRightPoint.x, y: dspts[0].y, normalCos: 1, normalSin: 0 });
            //         rightSectionDimPoints.push({
            //             x: startRightPoint.x,
            //             y: startRightPoint.y + sectionPointDict[skey].forward.input.Tcl,
            //             normalCos: 1,
            //             normalSin: 0,
            //         });
            //     }

            //     bottomSectionDimPoints.push({ x: startLeftPoint.x, y: startLeftPoint.y, normalCos: 0, normalSin: 1 });
            //     spts.forEach(pt => bottomSectionDimPoints.push({ x: pt.x, y: startLeftPoint.y, normalCos: 0, normalSin: 1 }));
            //     bottomSectionDimPoints.push({ x: startRightPoint.x, y: startLeftPoint.y, normalCos: 0, normalSin: 1 });
            //     leftSectionDimPoints.sort(function (a, b) {
            //         return a.y > b.y ? 1 : -1;
            //     });
            //     bottomSectionDimPoints.sort(function (a, b) {
            //         return a.x > b.x ? 1 : -1;
            //     });
            //     sectionView.push(
            //         {
            //             points: spts,
            //             type: "stud2",
            //             info: studInfo,
            //             rotX: 0,
            //             rotY: 0,
            //             rotZ: 0,
            //         },
            //         {
            //             points: lspts,
            //             type: "stud2",
            //             info: studInfo,
            //             rotX: 0,
            //             rotY: Math.PI / 2 + lRad,
            //             rotZ: 0,
            //         },
            //         {
            //             points: rspts,
            //             type: "stud2",
            //             info: studInfo,
            //             rotX: 0,
            //             rotY: -Math.PI / 2 + rRad,
            //             rotZ: 0,
            //         },
            //         {
            //             points: dspts,
            //             type: "stud2",
            //             info: studInfo,
            //             rotX: -Math.PI / 2,
            //             rotY: 0,
            //             rotZ: 0,
            //         }
            //     );
            // }

            // totalLength += segLength
            segLength = endPoint.girderStation - startPoint.girderStation;
            let remainder = (segLength - startOffset - endOffset) % studInfo.spacing;
            let sNum = segLength - remainder > 0 ? Math.floor((segLength - startOffset - endOffset - remainder) / studInfo.spacing) + 2 : 0;
            let x = startOffset;
            for (let k = 0; k < sNum; k++) {
                if (k === sNum - 1) {
                    x = segLength - endOffset;
                } else if (k > 0) {
                    x = startOffset + (remainder / 2 + studInfo.spacing / 2) + (k - 1) * studInfo.spacing;
                }

                for (let l = 0; l < spts.length; l++) {
                    points.push({
                        x: ((segLength - x) / segLength) * globalSpts[l].x + (x / segLength) * globalEpts[l].x,
                        y: ((segLength - x) / segLength) * globalSpts[l].y + (x / segLength) * globalEpts[l].y,
                        z: ((segLength - x) / segLength) * globalSpts[l].z + (x / segLength) * globalEpts[l].z,
                    });

                    if (l === 0) {
                        sidePoints.push({
                            x: ((segLength - x) / segLength) * sideSpt.x + (x / segLength) * sideEpt.x,
                            y: ((segLength - x) / segLength) * sideSpt.y + (x / segLength) * sideEpt.y,
                            z: ((segLength - x) / segLength) * sideSpt.z + (x / segLength) * sideEpt.z,
                        });
                    }
                }
                for (let l = 0; l < lspts.length; l++) {
                    if (((segLength - x) / segLength) * leftGlobalSpts[l].h + (x / segLength) * leftGlobalEpts[l].h >= 100) {
                        leftPoints.push({
                            x: ((segLength - x) / segLength) * leftGlobalSpts[l].x + (x / segLength) * leftGlobalEpts[l].x,
                            y: ((segLength - x) / segLength) * leftGlobalSpts[l].y + (x / segLength) * leftGlobalEpts[l].y,
                            z: ((segLength - x) / segLength) * leftGlobalSpts[l].z + (x / segLength) * leftGlobalEpts[l].z,
                        });
                    }
                    if (((segLength - x) / segLength) * rightGlobalSpts[l].h + (x / segLength) * rightGlobalEpts[l].h >= 100) {
                        rightPoints.push({
                            x: ((segLength - x) / segLength) * rightGlobalSpts[l].x + (x / segLength) * rightGlobalEpts[l].x,
                            y: ((segLength - x) / segLength) * rightGlobalSpts[l].y + (x / segLength) * rightGlobalEpts[l].y,
                            z: ((segLength - x) / segLength) * rightGlobalSpts[l].z + (x / segLength) * rightGlobalEpts[l].z,
                        });
                        rwSidePoints.push({
                            x: ((segLength - x) / segLength) * sideSpt.x + (x / segLength) * sideEpt.x,
                            y:
                                ((segLength - x) / segLength) * (sideStartY + rightGlobalSpts[l].h) +
                                (x / segLength) * (sideEndY + rightGlobalEpts[l].h),
                            z: 0,
                        });
                    }
                }
                leftDimPoints.push({
                    x: ((segLength - x) / segLength) * leftGlobalSpts[0].x + (x / segLength) * leftGlobalEpts[0].x,
                    y: ((segLength - x) / segLength) * leftGlobalSpts[0].y + (x / segLength) * leftGlobalEpts[0].y,
                    z: 0,
                    normalCos: Math.cos(rot),
                    normalSin: Math.sin(rot),
                });
                rightDimPoints.push({
                    x: ((segLength - x) / segLength) * rightGlobalSpts[0].x + (x / segLength) * rightGlobalEpts[0].x,
                    y: ((segLength - x) / segLength) * rightGlobalSpts[0].y + (x / segLength) * rightGlobalEpts[0].y,
                    z: 0,
                    normalCos: Math.cos(rot),
                    normalSin: Math.sin(rot),
                });
            }
            sidePoints.sort(function (a, b) {
                return a.x > b.x ? 1 : -1;
            });
            sidePoints.forEach(pt => sideDimPoints.push({ ...pt, normalCos: 0, normalSin: 1 }));

            // if (j === studPoints[i].length - 2) {
            //     leftDimPoints.push({
            //         x: leftGlobalEpts[0].x,
            //         y: leftGlobalEpts[0].y,
            //         z: 0,
            //         normalCos: Math.cos(rot2),
            //         normalSin: Math.sin(rot2),
            //     });
            //     rightDimPoints.push({
            //         x: rightGlobalEpts[0].x,
            //         y: rightGlobalEpts[0].y,
            //         z: 0,
            //         normalCos: Math.cos(rot2),
            //         normalSin: Math.sin(rot2),
            //     });
            //     endDimPoints.push({
            //         ...ToGlobalPoint(studPoints[i][j + 1].point, sectionPointDict[ekey].backward.web[0][0]),
            //         z: 0,
            //         normalCos: -Math.sin(rot2),
            //         normalSin: Math.cos(rot2),
            //     });
            //     dGlobalEpts.forEach(pt => endDimPoints.push({ ...pt, z: 0, normalCos: -Math.sin(rot2), normalSin: Math.cos(rot2) }));
            //     endDimPoints.push({
            //         ...ToGlobalPoint(studPoints[i][j + 1].point, sectionPointDict[ekey].backward.web[1][0]),
            //         z: 0,
            //         normalCos: -Math.sin(rot2),
            //         normalSin: Math.cos(rot2),
            //     });
            //     sideDimPoints.push({
            //         x: studPoints[i][j + 1].point.girderStation,
            //         y: sideEpt.y,
            //         z: 0,
            //         normalCos: 0,
            //         normalSin: 1,
            //     });
            // }
            let groupName = "G" + studPoints[i][j].girder.toString() + "SEG" + studPoints[i][j].seg.toString() + "_" + j.toString();
            if (leftPoints.length > 0) {
                studModels.push({
                    girder: studPoints[i][j].girder,
                    seg: studPoints[i][j].seg,
                    massNum: i * 1,
                    type: "stud2",
                    meta: {
                        material: "Bolt",
                        key: groupName + "L",
                        part: partName,
                        girder: studPoints[i][j].girder,
                        seg: studPoints[i][j].seg,
                        massNum: i * 1,
                    },
                    category: "leftWeb",
                    points: leftPoints,
                    rotX: 0,
                    rotY: Math.PI / 2 + lRad,
                    rotZ: rot,
                    stud: studInfo,
                    get threeFunc() {
                        return InitPoint => GenBTConcStudGeometry(this.rotX, this.rotY, this.rotZ, this.points, this.stud, InitPoint);
                    },
                    model: {
                        bottomView: leftPoints,
                    },
                });
            }
            if (rightPoints.length > 0) {
                studModels.push({
                    girder: studPoints[i][j].girder,
                    seg: studPoints[i][j].seg,
                    massNum: i * 1,
                    type: "stud2",
                    meta: {
                        material: "Bolt",
                        key: groupName + "R",
                        part: partName,
                        girder: studPoints[i][j].girder,
                        seg: studPoints[i][j].seg,
                        massNum: i * 1,
                    },
                    category: "rightWeb",
                    points: rightPoints,
                    rotX: 0,
                    rotY: -Math.PI / 2 + rRad,
                    rotZ: rot,
                    stud: studInfo,
                    get threeFunc() {
                        return InitPoint => GenBTConcStudGeometry(this.rotX, this.rotY, this.rotZ, this.points, this.stud, InitPoint);
                    },
                    model: {
                        sideView: rwSidePoints,
                        bottomView: rightPoints,
                    },
                });
            }
            if (!studDict[groupName]) {
                studDict[groupName] = {};
            }
            if (skey.includes("D")) {
                if (dGlobalSpts.length > 0) {
                    studModels.push({
                        girder: studPoints[i][j].girder,
                        seg: studPoints[i][j].seg,
                        massNum: i * 1,
                        type: "stud2",
                        meta: {
                            material: "Bolt",
                            key: groupName + "DS",
                            part: partName,
                            girder: studPoints[i][j].girder,
                            seg: studPoints[i][j].seg,
                            massNum: i * 1,
                        },
                        category: "diaphragmStart",
                        points: dGlobalSpts,
                        rotX: -Math.PI / 2,
                        rotY: 0,
                        rotZ: rot,
                        stud: studInfo,
                        get threeFunc() {
                            return InitPoint => GenBTConcStudGeometry(this.rotX, this.rotY, this.rotZ, this.points, this.stud, InitPoint);
                        },
                        model: {
                            sideView: dsSidePoints,
                            bottomView: dGlobalSpts,
                        },
                    });
                }
            }
            if (ekey.includes("D")) {
                if (dGlobalEpts.length > 0) {
                    studModels.push({
                        girder: studPoints[i][j].girder,
                        seg: studPoints[i][j].seg,
                        massNum: i * 1,
                        type: "stud2",
                        meta: {
                            material: "Bolt",
                            key: groupName + "DE",
                            part: partName,
                            girder: studPoints[i][j].girder,
                            seg: studPoints[i][j].seg,
                            massNum: i * 1,
                        },
                        category: "diaphragmEnd",
                        points: dGlobalEpts,
                        rotX: Math.PI / 2,
                        rotY: 0,
                        rotZ: rot,
                        stud: studInfo,
                        get threeFunc() {
                            return InitPoint => GenBTConcStudGeometry(this.rotX, this.rotY, this.rotZ, this.points, this.stud, InitPoint);
                        },
                        model: {
                            sideView: deSidePoints,
                            bottomView: dGlobalEpts,
                        },
                    });
                }
            }
            if (points.length > 0) {
                studModels.push({
                    girder: studPoints[i][j].girder,
                    seg: studPoints[i][j].seg,
                    massNum: i * 1,
                    type: "stud2",
                    meta: {
                        material: "Bolt",
                        key: groupName + "B",
                        part: partName,
                        girder: studPoints[i][j].girder,
                        seg: studPoints[i][j].seg,
                        massNum: i * 1,
                    },
                    category: "bottomFlange",
                    points: points,
                    rotX: 0,
                    rotY: 0,
                    rotZ: 0,
                    stud: studInfo,
                    get threeFunc() {
                        return InitPoint => GenBTConcStudGeometry(this.rotX, this.rotY, this.rotZ, this.points, this.stud, InitPoint);
                    },
                    model: {
                        sideView: sidePoints,
                        bottomView: points,
                    },
                });
            }
        }
        dimension.push({ part: partName, leftDimPoints, rightDimPoints, startDimPoints: startDimPoints.reverse(), endDimPoints, sideDimPoints });
        section.push({
            part: partName,
            sectionView,
            leftSectionDimPoints,
            rightSectionDimPoints,
            bottomSectionDimPoints,
        });
    }

    return { model: studModels, dimension, section }; //, studDict }
}
