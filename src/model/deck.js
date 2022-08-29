import {
    GetRefPoint,
    IntersectionPointOnSpline,
    Line,
    LineToOffsetSpline,
    Loft,
    MainPointGenerator,
    p,
    PointToGlobal,
    TwoLineIntersect,
    TwoPointsLength,
} from "@nexivil/package-modules";
import { ApplyXGradient, GetPointSectionInfo, GetWebPoint } from "./utils";

export function GenDeckModelFn(
    girderLayout,
    girderBaseInfo,
    gridInput,
    gridPointDict,
    sectionPointDict,
    girderStations,
    centerLineStations,
    xbeamGridInfo
) {
    const alignment = girderLayout.alignment;
    let slabLayout = gridInput.slabLayout;
    let deckPointDict = { parent: [], children: [], upperDict: {} };
    let deckPointDict2 = { parent: [], children: [], model: { sideView: [] } };
    let deckModel = {
        type: "loft",
        points: [],
        data: [],
        meta: { key: "slab", part: "concrete" },
        get threeFunc() {
            return InitPoint => LoftModelView(this.points, this.closed, this.cap, this.ptGroup, InitPoint);
        },
    };
    let deckLineDict = [[], []];
    const position = 0;
    const T = 2;
    const H = 1;
    let haunch = girderBaseInfo.support.HaunchH; //slabInfo.haunchHeight;
    let girderNum = girderLayout.girderCount;
    let PavementT = girderBaseInfo.common.PavementT;
    let blockOutH = girderBaseInfo.common.blockOutH;
    let blockOutL = girderBaseInfo.common.blockOutL;
    let endT = 0;
    let leftOffset = 0;
    let rightOffset = 0;
    let leftOffset2 = 0;
    let rightOffset2 = 0;
    let slabThickness = 0;
    let lGirderLine = girderLayout.girderSplines[0];
    let rGirderLine = girderLayout.girderSplines[girderLayout.girderSplines.length - 1];
    for (let i = 0; i < girderNum; i += Math.max(1, girderNum - 1)) {
        for (let j in girderStations[i]) {
            if (girderStations[i][j].key.substr(2, 1) === "D") {
                //거더개수가 10개 이상이면 오류 발생 예외처리 필요
                let mainStation = girderStations[i][j].point.mainStation;
                let mainPoint = girderStations[i][j].point; //MasterPointGenerator(mainStation, alignment, girderStation[i][j].point.skew)
                let key = girderStations[i][j].key.substr(2);
                if (mainStation < gridPointDict[slabLayout[0][position]].mainStation) {
                    leftOffset = slabLayout[0][3];
                    rightOffset = slabLayout[0][4];
                    slabThickness = slabLayout[0][H];
                    endT = slabLayout[0][T];
                } else if (mainStation > gridPointDict[slabLayout[slabLayout.length - 1][position]].mainStation) {
                    leftOffset = slabLayout[slabLayout.length - 1][3];
                    rightOffset = slabLayout[slabLayout.length - 1][4];
                    slabThickness = slabLayout[slabLayout.length - 1][H];
                    endT = slabLayout[slabLayout.length - 1][T];
                } else {
                    for (let k = 0; k < slabLayout.length - 1; k++) {
                        let ss = gridPointDict[slabLayout[k][position]].mainStation;
                        let es = gridPointDict[slabLayout[k + 1][position]].mainStation;
                        if (mainStation >= ss && mainStation <= es) {
                            let x = mainStation - ss;
                            let l = es - ss;
                            leftOffset = (slabLayout[k][3] * (l - x)) / l + (slabLayout[k + 1][3] * x) / l;
                            rightOffset = (slabLayout[k][4] * (l - x)) / l + (slabLayout[k + 1][4] * x) / l;
                            slabThickness = (slabLayout[k][H] * (l - x)) / l + (slabLayout[k + 1][H] * x) / l;
                            endT = (slabLayout[k][T] * (l - x)) / l + (slabLayout[k + 1][T] * x) / l;
                        }
                    }
                }
                let lLine = LineToOffsetSpline(lGirderLine, leftOffset);
                let rLine = LineToOffsetSpline(rGirderLine, rightOffset);
                //deckSectionInfo로 분리예정
                if (i === 0) {
                    // deckLineDict[0].push({ key: "LD" + key, point: LineMatch2(mainPoint, alignment, lLine), endT });
                    deckLineDict[0].push({ key: "LD" + key, point: IntersectionPointOnSpline(lLine, mainPoint, alignment), endT });
                } else if (i === girderNum - 1) {
                    // 임시로 masterPoint를 동일하게 가져감. 거더의 마스터포인트 계산하는 방법과 스큐가 있는 경우 마스터포인트와의 관계를 확인해야힘
                    // deckLineDict[1].push({ key: "RD" + key, point: LineMatch2(mainPoint, alignment, rLine), endT });
                    deckLineDict[1].push({ key: "RD" + key, point: IntersectionPointOnSpline(rLine, mainPoint, alignment), endT });
                }
            }
        }
    }

    let dummyL = -Infinity;
    let dummyR = -Infinity;
    let upperSidePoint = [];
    let lowerSidePoint = [];
    let startStation = centerLineStations[1].point.mainStation;

    for (let i = 1; i < centerLineStations.length - 1; i++) {
        //교대시점과 종점은 제외
        let mainPoint = centerLineStations[i].point; //centerLineStations[i].key.includes("TW")? MasterPointGenerator(centerLineStations[i].point.mainStation,alignment,centerLineStations[i].point.skew) :
        let mainStation = mainPoint.mainStation;
        let deckSectionPoint = [];
        let girderH = 0;
        let deckPointOffset = [];
        //deckSectionInfo로 분리예정
        for (let i = 0; i < slabLayout.length - 1; i++) {
            let ss = gridPointDict[slabLayout[i][position]].mainStation;
            let es = gridPointDict[slabLayout[i + 1][position]].mainStation;
            if (mainStation >= ss && mainStation <= es) {
                let x = mainStation - ss;
                let l = es - ss;
                let leftgirderPoint = IntersectionPointOnSpline(lGirderLine, mainPoint, alignment);
                let rightgirderPoint = IntersectionPointOnSpline(rGirderLine, mainPoint, alignment);
                let lcos = mainPoint.normalCos * leftgirderPoint.normalCos + mainPoint.normalSin * leftgirderPoint.normalSin;
                let rcos = mainPoint.normalCos * rightgirderPoint.normalCos + mainPoint.normalSin * rightgirderPoint.normalSin;
                leftOffset = ((slabLayout[i][3] * (l - x)) / l + (slabLayout[i + 1][3] * x) / l) / lcos + leftgirderPoint.offset;
                rightOffset = ((slabLayout[i][4] * (l - x)) / l + (slabLayout[i + 1][4] * x) / l) / rcos + rightgirderPoint.offset;
                leftOffset2 = (slabLayout[i][3] * (l - x)) / l + (slabLayout[i + 1][3] * x) / l;
                rightOffset2 = (slabLayout[i][4] * (l - x)) / l + (slabLayout[i + 1][4] * x) / l;
                slabThickness = (slabLayout[i][H] * (l - x)) / l + (slabLayout[i + 1][H] * x) / l;
                endT = (slabLayout[i][T] * (l - x)) / l + (slabLayout[i + 1][T] * x) / l;
                haunch = slabLayout[i][5]; //헌치의 변화에 따른 경계면에 대한 솔루션이 필요함
            }
        }
        //slabSide 도면에 사용되는 변수생성
        if (i === 1) {
            upperSidePoint.push({ x: mainStation - startStation, y: 0 - blockOutH, z: 0 });
            upperSidePoint.push({ x: mainStation - startStation + blockOutL, y: 0 - blockOutH, z: 0 });
            upperSidePoint.push({ x: mainStation - startStation + blockOutL, y: 0 - PavementT, z: 0 });
        } else if (i === centerLineStations.length - 2) {
            upperSidePoint.push({ x: mainStation - startStation - blockOutL, y: 0 - PavementT, z: 0 });
            upperSidePoint.push({ x: mainStation - startStation - blockOutL, y: 0 - blockOutH, z: 0 });
            upperSidePoint.push({ x: mainStation - startStation, y: 0 - blockOutH, z: 0 });
        } else if (i > 2 && i < centerLineStations.length - 3) {
            //CRK1, CRK6 제외
            upperSidePoint.push({ x: mainStation - startStation, y: 0 - PavementT, z: 0 });
        }
        lowerSidePoint.push({ x: mainStation - startStation, y: 0 - PavementT - slabThickness, z: 0 });

        let lLine = LineToOffsetSpline(lGirderLine, leftOffset2);
        let rLine = LineToOffsetSpline(rGirderLine, rightOffset2);
        let leftPoint = IntersectionPointOnSpline(lLine, mainPoint, alignment);
        let rightPoint = IntersectionPointOnSpline(rLine, mainPoint, alignment);
        if (
            centerLineStations[i].key.substr(0, 3) !== "CRN" &&
            centerLineStations[i].key !== "CRK0" &&
            centerLineStations[i].key !== "CRK7" &&
            centerLineStations[i].key.substr(0, 3) !== "CRS" &&
            centerLineStations[i].key.substr(0, 3) !== "CRX" &&
            !centerLineStations[i].key.includes("TW")
        ) {
            let key = centerLineStations[i].key.substr(2); // deckLineDict는 합성후 해석모델 단면정보에 들어감.
            deckLineDict[0].push({ key: "LD" + key, point: leftPoint, endT });
            deckLineDict[1].push({ key: "RD" + key, point: rightPoint, endT });
        }

        let slabUpperPoints = [
            PointToGlobal({ x: 0, y: -girderBaseInfo.common.PavementT }, GetRefPoint(leftPoint)),
            PointToGlobal({ x: 0, y: -girderBaseInfo.common.PavementT }, GetRefPoint(mainPoint)),
            PointToGlobal({ x: 0, y: -girderBaseInfo.common.PavementT }, GetRefPoint(rightPoint)),
        ];
        deckSectionPoint.push(
            { x: leftOffset, y: leftPoint.z - endT - mainPoint.z - PavementT },
            { x: leftOffset, y: leftPoint.z - mainPoint.z - PavementT },
            { x: 0, y: -PavementT },
            { x: rightOffset, y: rightPoint.z - mainPoint.z - PavementT },
            { x: rightOffset, y: rightPoint.z - endT - mainPoint.z - PavementT }
        );
        let slabLowerPoints = [];
        let slabLowerPoints2 = [];
        let slabLowerPoints3 = [];
        let slabLowerPoints4 = [];
        let offsetPoint = [leftOffset];
        let glw = [];
        let glw2 = [];
        let glw3 = [];
        let glw4 = [];
        let bool = true;
        for (let j = 0; j < girderNum; j++) {
            // let gridName = "G" + (j * 1 + 1) + slabLayout[i].position.substr(2, 2)
            let girderLine = girderLayout.girderSplines[j];
            let girderPoint = IntersectionPointOnSpline(girderLine, mainPoint, alignment);
            let refPtSkewO = GetRefPoint(girderPoint);
            let refPtSkewX = GetRefPoint(girderPoint, false);
            let lw = [];
            let lw2 = [];
            let lw3 = [];
            let lw4 = [];
            if (centerLineStations[i].key === "CRK0") {
                let gridName = "G" + (j * 1 + 1) + "K1";
                lw = GetHaunchPointsOnUF(gridPointDict[gridName], gridPointDict, girderBaseInfo, gridInput, j);
                girderH = sectionPointDict[gridName].forward.input.H;
            } else if (centerLineStations[i].key === "CRK7") {
                let gridName = "G" + (j * 1 + 1) + "K6";
                lw = GetHaunchPointsOnUF(gridPointDict[gridName], gridPointDict, girderBaseInfo, gridInput, j);
                girderH = sectionPointDict[gridName].backward.input.H;
                deckPointOffset.push(
                    gridPointDict[gridName].offset - sectionPointDict[gridName].forward.input.B2 / 2,
                    gridPointDict[gridName].offset + sectionPointDict[gridName].forward.input.B2 / 2
                );
            } else if (centerLineStations[i].key.includes("TW")) {
                //단면변화부 헌치
                let gridName = "G" + (j * 1 + 1) + centerLineStations[i].key.substr(2);
                if (!sectionPointDict[gridName].backward.input.isClosedTop && sectionPointDict[gridName].forward.input.isClosedTop) {
                    girderPoint = IntersectionPointOnSpline(
                        girderLine,
                        MainPointGenerator(mainPoint.mainStation - 50, alignment, mainPoint.skew),
                        alignment
                    );
                    let uf2 = GetHaunchPointsOnUF2(girderPoint, gridPointDict, girderBaseInfo, gridInput, j, true);
                    lw = uf2.points;
                    lw2 = uf2.points2;
                    bool = true;
                } else if (sectionPointDict[gridName].backward.input.isClosedTop && !sectionPointDict[gridName].forward.input.isClosedTop) {
                    girderPoint = IntersectionPointOnSpline(
                        girderLine,
                        MainPointGenerator(mainPoint.mainStation + 50, alignment, mainPoint.skew),
                        alignment
                    );
                    let uf2 = GetHaunchPointsOnUF2(girderPoint, gridPointDict, girderBaseInfo, gridInput, j, false);
                    lw = uf2.points;
                    lw2 = uf2.points2;
                    bool = false;
                } else {
                    lw = GetHaunchPointsOnUF(gridPointDict[gridName], gridPointDict, girderBaseInfo, gridInput, j);
                }
            } else if (centerLineStations[i].key.includes("CRX")) {
                //가로보부 헌치
                let xbeamIndex = centerLineStations[i].key.substr(3) * 1 - 1;
                let gridName;
                let checkBool = false;
                for (let p in xbeamGridInfo[xbeamIndex].xbeamType) {
                    if (xbeamGridInfo[xbeamIndex].xbeamType[p].includes("박스부")) {
                        checkBool = true;
                        break;
                    }
                }
                for (let p in xbeamGridInfo[xbeamIndex].gridPoint) {
                    if (xbeamGridInfo[xbeamIndex].gridPoint[p].includes("G" + (j * 1 + 1).toFixed(0))) {
                        gridName = xbeamGridInfo[xbeamIndex].gridPoint[p];
                        break;
                    }
                }
                girderPoint = gridName ? gridPointDict[gridName] : IntersectionPointOnSpline(girderLine, mainPoint, alignment);
                if (checkBool) {
                    let isLeft, isRight;
                    if (j === 0) {
                        isLeft = false;
                        isRight = true;
                    } else if (j === girderNum - 1) {
                        isLeft = true;
                        isRight = false;
                    } else {
                        isLeft = true;
                        isRight = true;
                    }
                    let uf2 = GetHaunchPointsOnUF3(girderPoint, gridPointDict, girderBaseInfo, gridInput, j, isLeft, isRight);
                    lw = uf2.points;
                    lw2 = uf2.points2;
                    lw3 = uf2.points3;
                    lw4 = uf2.points4;
                    bool = true;
                } else {
                    lw = GetHaunchPointsOnUF(girderPoint, gridPointDict, girderBaseInfo, gridInput, j);
                }
            } else {
                if (!centerLineStations[i].key.includes("CRN") && !centerLineStations[i].key.includes("CRB")) {
                    let gridName = "G" + (j * 1 + 1) + centerLineStations[i].key.substr(2);
                    girderH = sectionPointDict[gridName].forward.input.H;
                }
                lw = GetHaunchPointsOnUF(girderPoint, gridPointDict, girderBaseInfo, gridInput, j);
            }
            lw.forEach(elem => glw.push({ x: elem.x + girderPoint.offset, y: elem.y + girderPoint.z - mainPoint.z }));
            lw2.forEach(elem => glw2.push({ x: elem.x + girderPoint.offset, y: elem.y + girderPoint.z - mainPoint.z }));
            lw3.forEach(elem => glw3.push({ x: elem.x + girderPoint.offset, y: elem.y + girderPoint.z - mainPoint.z }));
            lw4.forEach(elem => glw4.push({ x: elem.x + girderPoint.offset, y: elem.y + girderPoint.z - mainPoint.z }));
            //haunch포인트에 대한 내용을 위의함수에 포함하여야 함.
            //추후 three.js union함수를 통한 바닥판 계산을 하는것은 어떨지 고민중
            if (centerLineStations[i].key.includes("CRX")) {
                // lw.forEach(pt => {
                //     slabLowerPoints.push(ToGlobalPoint3D(girderPoint, pt));
                // });
                let lpts = PointToGlobal(lw, refPtSkewX);
                slabLowerPoints.push(...ApplyXGradient(lpts, refPtSkewX));
            } else {
                lw.forEach(pt => slabLowerPoints.push(PointToGlobal(pt, refPtSkewO)));
            }
            offsetPoint.push(girderPoint.offset);
            let lpts2 = PointToGlobal(lw2, refPtSkewX);
            let lpts3 = PointToGlobal(lw3, refPtSkewX);
            let lpts4 = PointToGlobal(lw4, refPtSkewX);
            slabLowerPoints2.push(...ApplyXGradient(lpts2, refPtSkewX));
            slabLowerPoints3.push(...ApplyXGradient(lpts3, refPtSkewX));
            slabLowerPoints4.push(...ApplyXGradient(lpts4, refPtSkewX));
            // lw2.forEach(pt => slabLowerPoints2.push(ToGlobalPoint3D(girderPoint, pt)));
            // lw3.forEach(pt => slabLowerPoints3.push(ToGlobalPoint3D(girderPoint, pt)));
            // lw4.forEach(pt => slabLowerPoints4.push(ToGlobalPoint3D(girderPoint, pt)));

            lw.forEach(el => deckPointOffset.push(girderPoint.offset + el.x));
        }
        glw.pop(); //우측캔틸레버 헌치 포인트 제거
        glw.shift(); //좌측캔틸레버 헌치 포인트 제거
        glw2.pop(); //우측캔틸레버 헌치 포인트 제거
        glw2.shift(); //좌측캔틸레버 헌치 포인트 제거
        glw3.pop(); //우측캔틸레버 헌치 포인트 제거
        glw3.shift(); //좌측캔틸레버 헌치 포인트 제거
        glw4.pop(); //우측캔틸레버 헌치 포인트 제거
        glw4.shift(); //좌측캔틸레버 헌치 포인트 제거
        slabLowerPoints.pop(); //우측캔틸레버 헌치 포인트 제거
        slabLowerPoints.shift(); //좌측캔틸레버 헌치 포인트 제거
        // deckSectionPoint.push(...glw.reverse());
        offsetPoint.push(rightOffset);
        slabLowerPoints.unshift({ x: leftPoint.x, y: leftPoint.y, z: leftPoint.z - endT - girderBaseInfo.common.PavementT });
        slabLowerPoints.push({ x: rightPoint.x, y: rightPoint.y, z: rightPoint.z - endT - girderBaseInfo.common.PavementT });

        if (slabLowerPoints2.length > 0) {
            slabLowerPoints2.pop(); //우측캔틸레버 헌치 포인트 제거
            slabLowerPoints2.shift(); //좌측캔틸레버 헌치 포인트 제거
            slabLowerPoints2.unshift({ x: leftPoint.x, y: leftPoint.y, z: leftPoint.z - endT - girderBaseInfo.common.PavementT });
            slabLowerPoints2.push({ x: rightPoint.x, y: rightPoint.y, z: rightPoint.z - endT - girderBaseInfo.common.PavementT });
        }
        if (slabLowerPoints3.length > 0) {
            slabLowerPoints3.pop(); //우측캔틸레버 헌치 포인트 제거
            slabLowerPoints3.shift(); //좌측캔틸레버 헌치 포인트 제거
            slabLowerPoints3.unshift({ x: leftPoint.x, y: leftPoint.y, z: leftPoint.z - endT - girderBaseInfo.common.PavementT });
            slabLowerPoints3.push({ x: rightPoint.x, y: rightPoint.y, z: rightPoint.z - endT - girderBaseInfo.common.PavementT });
        }
        if (slabLowerPoints4.length > 0) {
            slabLowerPoints4.pop(); //우측캔틸레버 헌치 포인트 제거
            slabLowerPoints4.shift(); //좌측캔틸레버 헌치 포인트 제거
            slabLowerPoints4.unshift({ x: leftPoint.x, y: leftPoint.y, z: leftPoint.z - endT - girderBaseInfo.common.PavementT });
            slabLowerPoints4.push({ x: rightPoint.x, y: rightPoint.y, z: rightPoint.z - endT - girderBaseInfo.common.PavementT });
        }
        if (
            centerLineStations[i].key.includes("CRK") ||
            (centerLineStations[i].station > gridPointDict["CRK3"].mainStation &&
                centerLineStations[i].station < gridPointDict["CRK4"].mainStation &&
                leftPoint.mainStation > dummyL &&
                rightPoint.mainStation > dummyR)
        ) {
            //시점부는 제한을 줄 수 있으나, 종점부는 걸러지지가 않음
            if (slabLowerPoints2.length > 0 && bool) {
                deckModel["data"].push({
                    name: mainStation,
                    key: centerLineStations[i].key,
                    slabUpperPoints,
                    slabLowerPoints: slabLowerPoints2,
                    offsetPoint,
                    slabHeight: slabThickness + haunch,
                });
                deckModel["points"].push([...slabUpperPoints.slice().reverse(), ...slabLowerPoints2]);
            }
            deckModel["data"].push({
                name: mainStation,
                key: centerLineStations[i].key,
                slabUpperPoints,
                slabLowerPoints,
                offsetPoint,
                slabHeight: slabThickness + haunch,
            });
            deckModel["points"].push([...slabUpperPoints.slice().reverse(), ...slabLowerPoints]);
            if (slabLowerPoints2.length > 0 && !bool) {
                deckModel["data"].push({
                    name: mainStation,
                    key: centerLineStations[i].key,
                    slabUpperPoints,
                    slabLowerPoints: slabLowerPoints2,
                    offsetPoint,
                    slabHeight: slabThickness + haunch,
                });
                deckModel["points"].push([...slabUpperPoints.slice().reverse(), ...slabLowerPoints2]);
            }
            if (slabLowerPoints3.length > 0) {
                deckModel["data"].push({
                    name: mainStation,
                    key: centerLineStations[i].key,
                    slabUpperPoints,
                    slabLowerPoints: slabLowerPoints3,
                    offsetPoint,
                    slabHeight: slabThickness + haunch,
                });
                deckModel["data"].push({
                    name: mainStation,
                    key: centerLineStations[i].key,
                    slabUpperPoints,
                    slabLowerPoints: slabLowerPoints4,
                    offsetPoint,
                    slabHeight: slabThickness + haunch,
                });
                deckModel["points"].push([...slabUpperPoints.slice().reverse(), ...slabLowerPoints3]);
                deckModel["points"].push([...slabUpperPoints.slice().reverse(), ...slabLowerPoints4]);
            }
        }
        let bottomY = 0; //-1*(PavementT + slabThickness + haunch + girderH)
        let dimSectionView = [{ x: leftOffset, y: bottomY }];
        for (let ii in deckPointOffset) {
            dimSectionView.push({ x: deckPointOffset[ii], y: bottomY });
        }
        dimSectionView.push({ x: rightOffset, y: bottomY });
        deckPointDict2["parent"].push({
            part: centerLineStations[i].key,
            station: centerLineStations[i].station,
            model: { sectionView: [new Line([...deckSectionPoint.slice(1), ...glw.reverse(), deckSectionPoint[0]], "WHITE", true, null)] },
            dimension: { sectionView: dimSectionView },
            slabHeight: slabThickness + haunch,
            leftOffset,
            rightOffset,
            slabUpperPoints,
            slabThickness,
            haunch,
            PavementT,
            girderH,
        });
        dummyL = leftPoint.mainStation;
        dummyR = rightPoint.mainStation;
    }
    deckLineDict[0].sort(function (a, b) {
        return a.point.mainStation < b.point.mainStation ? -1 : 1;
    });
    deckLineDict[1].sort(function (a, b) {
        return a.point.mainStation < b.point.mainStation ? -1 : 1;
    });

    //deckPointDict 새로모델 작성 2022.06.01
    //가로보가 경사인 경우 가로보에 따른 바닥판 변화부 다시 작성 및 가로보 헌치부분 길이방향 단면이 이상함
    //단부 헌치기 0인 경우에도 상부플렌지가 수평인경우 헌치가 발생하는 오류 발생

    let kLineList = [];
    let lowerLofts = [];
    for (let i = 1; i < centerLineStations.length - 1; i++) {
        let mainPoint = centerLineStations[i].point;
        if (centerLineStations[i].key.includes("CRK")) {
            let station = centerLineStations[i].station;
            let leftgirderPoint = IntersectionPointOnSpline(lGirderLine, mainPoint, alignment);
            let rightgirderPoint = IntersectionPointOnSpline(rGirderLine, mainPoint, alignment);

            for (let j = 0; j < slabLayout.length - 1; j++) {
                //upperSlabPoint에 대한 함수화 예정
                let ss = gridPointDict[slabLayout[j][position]].mainStation;
                let es = gridPointDict[slabLayout[j + 1][position]].mainStation;
                if (station >= ss && station <= es) {
                    let x = station - ss;
                    let l = es - ss;
                    let lcos = mainPoint.normalCos * leftgirderPoint.normalCos + mainPoint.normalSin * leftgirderPoint.normalSin;
                    let rcos = mainPoint.normalCos * rightgirderPoint.normalCos + mainPoint.normalSin * rightgirderPoint.normalSin;
                    leftOffset = ((slabLayout[j][3] * (l - x)) / l + (slabLayout[j + 1][3] * x) / l) / lcos + leftgirderPoint.offset;
                    rightOffset = ((slabLayout[j][4] * (l - x)) / l + (slabLayout[j + 1][4] * x) / l) / rcos + rightgirderPoint.offset;
                    leftOffset2 = (slabLayout[j][3] * (l - x)) / l + (slabLayout[j + 1][3] * x) / l;
                    rightOffset2 = (slabLayout[j][4] * (l - x)) / l + (slabLayout[j + 1][4] * x) / l;
                    slabThickness = (slabLayout[j][H] * (l - x)) / l + (slabLayout[j + 1][H] * x) / l;
                    endT = (slabLayout[j][T] * (l - x)) / l + (slabLayout[j + 1][T] * x) / l;
                    haunch = slabLayout[j][5]; //헌치의 변화에 따른 경계면에 대한 솔루션이 필요함
                }
            }
            //slabSide 도면에 사용되는 변수생성
            let lLine = LineToOffsetSpline(lGirderLine, leftOffset2);
            let rLine = LineToOffsetSpline(rGirderLine, rightOffset2);
            let leftPoint = IntersectionPointOnSpline(lLine, mainPoint, alignment);
            let rightPoint = IntersectionPointOnSpline(rLine, mainPoint, alignment);
            kLineList.push([leftPoint, rightPoint]);
        }
    }

    let slabUpperLoft = [];
    let leftBorder = [];
    let rightBorder = [];
    let leftCantil = [];
    let rightCantil = [];

    for (let i = 1; i < centerLineStations.length - 1; i++) {
        let mainPoint = centerLineStations[i].point;
        let key = centerLineStations[i].key;
        if (!key.includes("CRX") && !key.includes("TW")) {
            let station = mainPoint.mainStation;
            let leftgirderPoint = IntersectionPointOnSpline(lGirderLine, mainPoint, alignment);
            let rightgirderPoint = IntersectionPointOnSpline(rGirderLine, mainPoint, alignment);

            for (let j = 0; j < slabLayout.length - 1; j++) {
                //upperSlabPoint에 대한 함수화 예정
                let ss = gridPointDict[slabLayout[j][position]].mainStation;
                let es = gridPointDict[slabLayout[j + 1][position]].mainStation;
                if (station >= ss && station <= es) {
                    let x = station - ss;
                    let l = es - ss;
                    let lcos = mainPoint.normalCos * leftgirderPoint.normalCos + mainPoint.normalSin * leftgirderPoint.normalSin;
                    let rcos = mainPoint.normalCos * rightgirderPoint.normalCos + mainPoint.normalSin * rightgirderPoint.normalSin;
                    leftOffset = ((slabLayout[j][3] * (l - x)) / l + (slabLayout[j + 1][3] * x) / l) / lcos + leftgirderPoint.offset;
                    rightOffset = ((slabLayout[j][4] * (l - x)) / l + (slabLayout[j + 1][4] * x) / l) / rcos + rightgirderPoint.offset;
                    leftOffset2 = (slabLayout[j][3] * (l - x)) / l + (slabLayout[j + 1][3] * x) / l;
                    rightOffset2 = (slabLayout[j][4] * (l - x)) / l + (slabLayout[j + 1][4] * x) / l;
                    slabThickness = (slabLayout[j][H] * (l - x)) / l + (slabLayout[j + 1][H] * x) / l;
                    endT = (slabLayout[j][T] * (l - x)) / l + (slabLayout[j + 1][T] * x) / l;
                    haunch = slabLayout[j][5]; //헌치의 변화에 따른 경계면에 대한 솔루션이 필요함
                }
            }
            //slabSide 도면에 사용되는 변수생성
            let lLine = LineToOffsetSpline(lGirderLine, leftOffset2);
            let rLine = LineToOffsetSpline(rGirderLine, rightOffset2);
            let leftPoint = IntersectionPointOnSpline(lLine, mainPoint, alignment);
            let rightPoint = IntersectionPointOnSpline(rLine, mainPoint, alignment);

            let bool = kLineList.some(kline => Boolean(TwoLineIntersect(kline, [leftPoint, rightPoint])));

            if (!bool || ["CRK"].some(k => key.includes(k))) {
                deckPointDict.upperDict[key] = { leftPoint, rightPoint };
                let lw = GetLowerSlabCantilPoints(leftgirderPoint, gridPointDict, girderBaseInfo, gridInput, 0); //sectionPoint가 있으면 없으면 될듯함
                let rw = GetLowerSlabCantilPoints(rightgirderPoint, gridPointDict, girderBaseInfo, gridInput, girderNum - 1); //sectionPoint가 있으면 없으면 될듯함
                let block = [0];
                if (["K0", "K1", "K6", "K7"].some(k => key.includes(k))) {
                    block = [blockOutH];
                } else if (key.includes("B0")) {
                    block = [blockOutH, 0];
                } else if (key.includes("B7")) {
                    block = [0, blockOutH];
                }
                //block에 대한 loft객체 생성 필요
                for (let a of block) {
                    let slabUpperPoints = [
                        PointToGlobal(lw[1], GetRefPoint(leftgirderPoint)),
                        PointToGlobal(lw[0], GetRefPoint(leftgirderPoint)),
                        PointToGlobal({ x: 0, y: -girderBaseInfo.common.PavementT - endT }, GetRefPoint(leftPoint)),
                        PointToGlobal({ x: 0, y: -girderBaseInfo.common.PavementT - a }, GetRefPoint(leftPoint)),
                        PointToGlobal({ x: 0, y: -girderBaseInfo.common.PavementT - a }, GetRefPoint(mainPoint)),
                        PointToGlobal({ x: 0, y: -girderBaseInfo.common.PavementT - a }, GetRefPoint(rightPoint)),
                        PointToGlobal({ x: 0, y: -girderBaseInfo.common.PavementT - endT }, GetRefPoint(rightPoint)),
                        PointToGlobal(rw[3], GetRefPoint(rightgirderPoint)),
                        PointToGlobal(rw[2], GetRefPoint(rightgirderPoint)),
                    ];
                    slabUpperLoft.push(slabUpperPoints.slice(3, 6));
                    leftBorder.push(leftPoint);
                    rightBorder.push(rightPoint);
                    leftCantil.push(slabUpperPoints.slice(0, 4).reverse());
                    rightCantil.push(slabUpperPoints.slice(-4).reverse());
                }
            }
        }
    }
    deckPointDict["children"].push(
        new Loft(slabUpperLoft, false, "Concrete", { key: "slabUpper", part: "concrete" }),
        new Loft(leftCantil, false, "Concrete", { key: "slab0-1", part: "concrete" }),
        new Loft(rightCantil, false, "Concrete", { key: "slab" + String(girderNum) + "-" + String(girderNum + 1), part: "concrete" })
    );
    lowerLofts.push(leftCantil, rightCantil);
    for (let j = 0; j < girderStations.length; j++) {
        let girderLine = girderLayout.girderSplines[j];
        let dummyStation = -Infinity;
        let slabLowerPoints = [];
        let dummySub = [];
        for (let i = 0; i < girderStations[j].length; i++) {
            let key = girderStations[j][i].key;
            let station = girderStations[j][i].station;
            let isHaunch = true;
            if (
                station <= gridPointDict["G" + String(j + 1) + "K2"].mainStation ||
                station >= gridPointDict["G" + String(j + 1) + "K5"].mainStation
            ) {
                isHaunch = false;
            }
            if (station > dummyStation) {
                let bool = false;
                let slabLowerSub0 = []; // K0/K7에 대한 단면
                let slabLowerSub = [];
                let slabLowerSub2 = [];
                let girderPoint = gridPointDict[key];
                let refGirderPoint = GetRefPoint(girderPoint);
                let sectionPointB = sectionPointDict[key].backward;
                let sectionPointF = sectionPointDict[key].forward;
                let isForward = undefined;
                if (sectionPointB.input.isClosedTop && !sectionPointF.input.isClosedTop) {
                    isForward = true;
                } else if (!sectionPointB.input.isClosedTop && sectionPointF.input.isClosedTop) {
                    isForward = false;
                }
                if (isForward === undefined) {
                    let lw = GetLowerSlabPoints(girderPoint, gridPointDict, girderBaseInfo, gridInput, j, isHaunch); //sectionPoint가 있으면 없으면 될듯함
                    if (key.includes("K1")) {
                        slabLowerSub0.push(...PointToGlobal(lw, GetRefPoint(gridPointDict["G" + String(j + 1) + "K0"])));
                        // lw.forEach(element => slabLowerSub0.push(ToGlobalPoint(gridPointDict["G" + String(j + 1) + "K0"], element)));
                    } else if (key.includes("K6")) {
                        slabLowerSub0.push(...PointToGlobal(lw, GetRefPoint(gridPointDict["G" + String(j + 1) + "K7"])));
                        // lw.forEach(element => slabLowerSub0.push(ToGlobalPoint(gridPointDict["G" + String(j + 1) + "K7"], element)));
                    }
                    slabLowerSub.push(...PointToGlobal(lw, refGirderPoint));
                    // lw.forEach(element => slabLowerSub.push(ToGlobalPoint(girderPoint, element)));
                } else {
                    let inputSt = isForward ? station + 100 : station - 100;
                    let girderPt = IntersectionPointOnSpline(girderLine, MainPointGenerator(inputSt, alignment, girderPoint.skew), alignment);
                    let refPtSkewX = GetRefPoint(girderPt, false);
                    let lws = GetLowerSlabOpenPoints(girderPt, gridPointDict, girderBaseInfo, gridInput, j, isForward); //sectionPoint가 있으면 없으면 될듯함
                    let gPts0 = PointToGlobal(lws[0], refPtSkewX);
                    let gPts1 = PointToGlobal(lws[1], refPtSkewX);
                    slabLowerSub.push(...ApplyXGradient(gPts0, refPtSkewX));
                    slabLowerSub2.push(...ApplyXGradient(gPts1, refPtSkewX));
                    // lws[0].forEach(element => slabLowerSub.push(ToGlobalPoint3D(girderPt, element)));
                    // lws[1].forEach(element => slabLowerSub2.push(ToGlobalPoint3D(girderPt, element)));
                }
                if (dummySub.length > 0) {
                    bool = TwoLineIntersect([slabLowerSub[0], slabLowerSub[slabLowerSub.length - 1]], [dummySub[0], dummySub[dummySub.length - 1]]);
                }

                let CRNbool = true;
                if (
                    (station > gridPointDict["G" + String(j + 1) + "K2"].mainStation &&
                        station < gridPointDict["G" + String(j + 1) + "K3"].mainStation) ||
                    (station > gridPointDict["G" + String(j + 1) + "K4"].mainStation &&
                        station < gridPointDict["G" + String(j + 1) + "K5"].mainStation)
                ) {
                    CRNbool = false;
                }
                if ((!bool || key.includes("K")) && CRNbool) {
                    if (key.includes("K1")) {
                        slabLowerPoints.push(slabLowerSub0);
                    }
                    slabLowerPoints.push(slabLowerSub);
                    if (slabLowerSub2.length > 0) {
                        slabLowerPoints.push(slabLowerSub2);
                    }
                    dummySub = slabLowerSub;
                    if (key.includes("K6")) {
                        slabLowerPoints.push(slabLowerSub0);
                    }
                }
                dummyStation = station;
            }
        }
        lowerLofts.push(slabLowerPoints);
        deckPointDict["children"].push(new Loft(slabLowerPoints, false, "Concrete", { key: "slab" + String(j + 1), part: "concrete" }));
    }
    // console.log("xbeamGrid", xbeamGrid, "xbeamGrid폐기(여기서밖에 안씀) 모든 xbeam에 대한 정보를 가져오면 사각에서 비정형 Xbeam 바닥판 작도가 해결됨")
    for (let j = 0; j < girderNum - 1; j++) {
        let girderLine = girderLayout.girderSplines[j];
        let girderLine2 = girderLayout.girderSplines[j + 1];
        let dummyStation = -Infinity;
        let slabLowerPoints = [];
        for (let i = 1; i < centerLineStations.length - 1; i++) {
            let key = centerLineStations[i].key;
            let mainPoint = centerLineStations[i].point; //centerLineStations[i].key.includes("TW")? MasterPointGenerator(centerLineStations[i].point.mainStation,alignment,centerLineStations[i].point.skew) :
            let station = mainPoint.mainStation;
            let isHaunch = true;
            if (station <= gridPointDict["CRK2"].mainStation || station >= gridPointDict["CRK5"].mainStation) {
                isHaunch = false;
            }
            if (station > dummyStation) {
                let girderPoint = IntersectionPointOnSpline(girderLine, mainPoint, alignment);
                let girderPoint2 = IntersectionPointOnSpline(girderLine2, mainPoint, alignment);
                let checkBool = false;
                let newSkew = Math.PI / 2;
                let newSec = 1;
                let newSec2 = 1;
                let newSkew2 = Math.PI / 2;
                let B2l = 0;
                let B2r = 0;
                if (centerLineStations[i].key.includes("CRX")) {
                    //가로보부 헌치
                    let xbeamIndex = centerLineStations[i].key.substr(3) * 1 - 1;
                    for (let m = 0; m < xbeamGridInfo[xbeamIndex].gridPoint.length - 1; m++) {
                        //로직이 잘못되어 있음
                        if (
                            xbeamGridInfo[xbeamIndex].gridPoint[m].includes("G" + String(j + 1)) &&
                            xbeamGridInfo[xbeamIndex].xbeamType[m].includes("박스부")
                        ) {
                            checkBool = true;
                            let pt1 = gridPointDict[xbeamGridInfo[xbeamIndex].gridPoint[m]];
                            let pt2 = gridPointDict[xbeamGridInfo[xbeamIndex].gridPoint[m + 1]];
                            let refPt1 = GetRefPoint(pt1);
                            let refPt2 = GetRefPoint(pt2);
                            if (
                                Math.min(pt1.mainStation, pt2.mainStation) <= gridPointDict["CRK2"].mainStation ||
                                Math.max(pt1.mainStation, pt2.mainStation) >= gridPointDict["CRK5"].mainStation
                            ) {
                                isHaunch = false;
                            }
                            if (isHaunch) {
                                B2l = sectionPointDict[xbeamGridInfo[xbeamIndex].gridPoint[m]].forward.input.B2;
                                B2r = sectionPointDict[xbeamGridInfo[xbeamIndex].gridPoint[m + 1]].forward.input.B2;
                                let coord1 = PointToGlobal(p(B2l / 2, 0), refPt1); //좌측거더 우측웹 포인트
                                let coord2 = PointToGlobal(p(-B2r / 2, 0), refPt2); //우측거더 좌측웹 포인트
                                girderPoint = { ...refPt1, ...coord1 };
                                girderPoint2 = { ...refPt2, ...coord2 };
                                let l = TwoPointsLength(girderPoint, girderPoint2, true);
                                let xbeamCos = Math.min(
                                    1,
                                    ((girderPoint2.x - girderPoint.x) / l) * girderPoint.normalCos +
                                        ((girderPoint2.y - girderPoint.y) / l) * girderPoint.normalSin
                                );
                                newSec = 1 / xbeamCos;
                                let xbeamCos2 = Math.min(
                                    1,
                                    ((girderPoint2.x - girderPoint.x) / l) * girderPoint2.normalCos +
                                        ((girderPoint2.y - girderPoint.y) / l) * girderPoint2.normalSin
                                );
                                newSec2 = 1 / xbeamCos2;
                                let sign1 =
                                    girderPoint.normalCos * (girderPoint2.y - girderPoint.y) -
                                        girderPoint.normalSin * (girderPoint2.x - girderPoint.x) >
                                    0
                                        ? 1
                                        : -1;
                                let sign2 =
                                    girderPoint2.normalCos * (girderPoint2.y - girderPoint.y) -
                                        girderPoint2.normalSin * (girderPoint2.x - girderPoint.x) >
                                    0
                                        ? 1
                                        : -1;
                                newSkew = Math.PI / 2 + sign1 * Math.acos(xbeamCos);
                                newSkew2 = Math.PI / 2 + sign2 * Math.acos(xbeamCos2);
                            }
                            break;
                        }
                    }
                }
                if (checkBool && isHaunch) {
                    let lws = GetLowerSlabXbeamPoints(girderPoint, gridPointDict, girderBaseInfo, gridInput, j, 300, newSec).right;
                    //check!!!!
                    let rws = GetLowerSlabXbeamPoints(girderPoint2, gridPointDict, girderBaseInfo, gridInput, j + 1, 300, newSec2).left;
                    for (let w of [0, 1, 2, 3]) {
                        let slabLowerSub = [];
                        let newSkewPt1 = { ...girderPoint, skew: newSkew };
                        let newSkewPt2 = { ...girderPoint2, skew: newSkew2 };
                        let refPt1SkewO = GetRefPoint(newSkewPt1);
                        let refPt2SkewO = GetRefPoint(newSkewPt2);
                        lws[w].forEach(element => slabLowerSub.push(PointToGlobal(p(element.x - B2l / 2, element.y, element.z), refPt1SkewO)));
                        rws[w].forEach(element => slabLowerSub.push(PointToGlobal(p(element.x + B2r / 2, element.y, element.z), refPt2SkewO)));
                        slabLowerPoints.push(slabLowerSub);
                    }
                } else if (!key.includes("TW") && !key.includes("CRX") && !key.includes("CRS")) {
                    //&& !key.includes("CRN")
                    //xbeam이 아닌경우
                    let CRNbool = true;
                    if (
                        key.includes("CRN") &&
                        ((station >= gridPointDict["CRK2"].mainStation && station <= gridPointDict["CRK3"].mainStation) ||
                            (station >= gridPointDict["CRK4"].mainStation && station <= gridPointDict["CRK5"].mainStation))
                    ) {
                        CRNbool = false;
                    }

                    if (CRNbool) {
                        let slabLowerSub = [];
                        let lw = GetLowerSlabXbeamPoints(girderPoint, gridPointDict, girderBaseInfo, gridInput, j, 0, 1, isHaunch); //sectionPoint가 있으면 없으면 될듯함
                        let rw = GetLowerSlabXbeamPoints(girderPoint2, gridPointDict, girderBaseInfo, gridInput, j + 1, 0, 1, isHaunch); //sectionPoint가 있으면 없으면 될듯함
                        lw.right0.forEach(element => slabLowerSub.push(PointToGlobal(element, GetRefPoint(girderPoint))));
                        rw.left0.forEach(element => slabLowerSub.push(PointToGlobal(element, GetRefPoint(girderPoint2))));
                        slabLowerPoints.push(slabLowerSub);
                    }
                }
            }
            dummyStation = station;
        }
        lowerLofts.push(slabLowerPoints);
        deckPointDict["children"].push(
            new Loft(slabLowerPoints, false, "Concrete", { key: "slab" + String(j + 1) + "-" + String(j + 2), part: "concrete" })
        );
    }

    // //바닥면에 대한 도면정보 생성
    // let bottomView = [];
    // for (let loft of lowerLofts) {
    //     let hLine = [];
    //     let vLine = [];
    //     loft[0].forEach(el => hLine.push([]));
    //     for (let i in loft) {
    //         loft[i].forEach((value, index) => hLine[index].push(value));
    //         vLine.push(loft[i]);
    //     }
    //     bottomView.push(...ToSegLineList(gridLineToSegment(vLine), "GREEN"));
    //     bottomView.push(...ToSegLineList(gridLineToSegment(hLine, false), "GREEN"));
    // }

    // deckModel["model"] = { bottomView };
    // deckPointDict2["children"].push(deckModel);
    // deckPointDict2["upperSidePoint"] = upperSidePoint;
    // deckPointDict2["lowerSidePoint"] = lowerSidePoint;
    // deckPointDict2["model"]["sideView"].push(new Line([...upperSidePoint, ...lowerSidePoint.reverse()], "GREEN", true, null));
    // deckPointDict2["upperSidePoint"] = upperSidePoint;
    // deckPointDict2["children2"] = deckPointDict["children"];

    return { model: deckPointDict, deckLineDict, deckPointDict2 }; //{ slab1, slab2 }
}

export function GenBarrierModelFn(
    girderLayout,
    girderBaseInfo,
    gridPointDict,
    centerLineStations,
    slabLayout,
    barrierLayoutInput,
    barrierSectionDict
) {
    let paveT = girderBaseInfo.common.PavementT;
    let barrierLayout = [];
    barrierLayoutInput.forEach(el => barrierLayout.push({ type: el[0], from: el[1], offset: el[2] }));

    let barrierLoad = []; //[[true, 180, 200000],[false, 180, 200000]];
    let paveLoad = []; //[[true, 450, false, 450, 80]]; //반드시 첫번째행은 차선이어야 함
    let pedeLoad = [];
    for (let i = 0; i < barrierLayout.length; i++) {
        if (barrierLayout[i]["type"] === "도로포장" || barrierLayout[i]["type"] === "보도부") {
            let section = barrierSectionDict[barrierLayout[i - 1]["type"]];
            let section2 = barrierSectionDict[barrierLayout[i + 1]["type"]];
            let isLeft = barrierLayout[i - 1]["from"] === "슬래브좌측" ? true : false;
            let stOffset =
                barrierLayout[i - 1]["from"] === "슬래브좌측" ? barrierLayout[i - 1]["offset"] + section.w : barrierLayout[i - 1]["offset"];
            let isLeft2 = barrierLayout[i + 1]["from"] === "슬래브좌측" ? true : false;
            let edOffset =
                barrierLayout[i + 1]["from"] === "슬래브좌측" ? barrierLayout[i + 1]["offset"] : barrierLayout[i + 1]["offset"] + section2.w;
            if (barrierLayout[i]["type"] === "도로포장") {
                paveLoad.push([isLeft, stOffset, isLeft2, edOffset, paveT]);
            } else {
                //보도부의 경우에는 포장두께를 어떻게 할지 정보가 필요함
                pedeLoad.push([isLeft, stOffset, isLeft2, edOffset, paveT]);
            }
        } else {
            let section = barrierSectionDict[barrierLayout[i]["type"]];
            let points = barrierFnMap[barrierLayout[i]["type"]](section.w, section.h);
            let area = 0;
            let AY = 0;
            for (let j = 0; j < points.length - 1; j++) {
                let a = ((points[j + 1].x - points[j].x) * (points[j].y + points[j + 1].y)) / 2;
                let y =
                    points[j].x + ((points[j].y + 2 * points[j + 1].y) / (3 * points[j].y + 3 * points[j + 1].y)) * (points[j + 1].x - points[j].x);
                area += a;
                AY += a * y;
            }
            let dx = Math.abs(AY / area);
            let isLeft = barrierLayout[i]["from"] === "슬래브좌측" ? true : false;
            barrierLoad.push([isLeft, barrierLayout[i]["offset"] + dx, Math.abs(area)]);
        }
    }

    const alignment = girderLayout.alignment;
    // slabLayout object to list
    // 방호벽좌, 방호벽우, 사각블럭좌, 사각블럭우, 도로포장, 보도부
    // 슬래브좌측, 슬래브우측

    let newbarrierDict = { parent: [], children: [] };
    let newpavementDict = { parent: [], children: [] };
    let leftOffset = slabLayout[0][3];
    let rightOffset = slabLayout[slabLayout.length - 1][3];
    let lGirderLine = girderLayout.girderSplines[0];
    let rGirderLine = girderLayout.girderSplines[girderLayout.girderSplines.length - 1];

    let kLineList = [];
    for (let i = 1; i < centerLineStations.length - 1; i++) {
        let mainPoint = centerLineStations[i].point;
        if (centerLineStations[i].key.includes("CRK")) {
            kLineList.push([
                IntersectionPointOnSpline(LineToOffsetSpline(lGirderLine, leftOffset), mainPoint, alignment),
                IntersectionPointOnSpline(LineToOffsetSpline(rGirderLine, rightOffset), mainPoint, alignment),
            ]);
        }
    }
    let new_BarrierData = {};
    let new_PavementData = {};
    let isSlab = false;
    for (let i = 1; i < centerLineStations.length - 1; i++) {
        if (centerLineStations[i].key === "CRK0") {
            isSlab = true;
        }
        if (isSlab) {
            let mainPoint = centerLineStations[i].point;
            let mainStation = mainPoint.mainStation;
            for (let j = 0; j < slabLayout.length - 1; j++) {
                let ss = gridPointDict[slabLayout[j][0]].mainStation;
                let es = gridPointDict[slabLayout[j + 1][0]].mainStation;
                if (mainStation >= ss && mainStation <= es) {
                    let x = mainStation - ss;
                    let l = es - ss;
                    if (Math.abs(es - ss) < 0.0001) {
                        x = 0;
                        l = 1;
                    }
                    leftOffset = (slabLayout[j][3] * (l - x)) / l + (slabLayout[j + 1][3] * x) / l;
                    rightOffset = (slabLayout[j][4] * (l - x)) / l + (slabLayout[j + 1][4] * x) / l;
                }
            }
            let lowPt = [];
            let upperPt = [];
            let lowPt2D = [];
            let upperPt2D = [];
            let pede = [];
            let pave = [];
            let leftP = IntersectionPointOnSpline(LineToOffsetSpline(lGirderLine, leftOffset), mainPoint, alignment);
            let rightP = IntersectionPointOnSpline(LineToOffsetSpline(rGirderLine, rightOffset), mainPoint, alignment);
            let bool = kLineList.some(kline => Boolean(TwoLineIntersect(kline, [leftP, rightP])));
            let section2DBarrier = { part: centerLineStations[i].key, model: { sectionView: [] }, dimension: { topView: [], sectionView: [] } }; // parent data
            let section2DPavement = { part: centerLineStations[i].key, model: { sectionView: [] } }; // parent data
            if (!bool || centerLineStations[i].key.includes("CRK")) {
                for (let b = 0; b < barrierLayout.length; b++) {
                    let key = barrierLayout[b]["type"] + b.toFixed(0);
                    //편경사가 변화하는 경우를 고려하여 기준점을 계속 생성하면서 단면 생성함
                    if (barrierSectionDict.hasOwnProperty(barrierLayout[b]["type"])) {
                        if (!new_BarrierData.hasOwnProperty(key)) {
                            new_BarrierData[key] = new Loft([], true, "Concrete", { key: "barrier", part: key });
                            //     new_BarrierData[key] = {
                            //         type: "loft",
                            //         points: [],
                            //         gridPoint: [],
                            //         closed: false,
                            //         meta: { key: "barrier", part: key },
                            //         get threeFunc() {
                            //             return InitPoint => LoftModelView(this.points, this.closed, this.cap, this.ptGroup, InitPoint);
                            //         },
                            //     };
                        }
                        let section = barrierSectionDict[barrierLayout[b]["type"]];
                        section["points"] = barrierFnMap[barrierLayout[b]["type"]](section.w, section.h);
                        let pts = [];
                        // let geo = new THREE.Geometry();
                        if (barrierLayout[b]["from"] === "슬래브좌측") {
                            let lLine1 = LineToOffsetSpline(lGirderLine, leftOffset + barrierLayout[b]["offset"]);
                            let lLine2 = LineToOffsetSpline(lGirderLine, leftOffset + barrierLayout[b]["offset"] + section.w);
                            let refPt1 = GetRefPoint(IntersectionPointOnSpline(lLine1, mainPoint, alignment));
                            let refPt2 = GetRefPoint(IntersectionPointOnSpline(lLine2, mainPoint, alignment));
                            let pt1 = PointToGlobal({ x: 0, y: -paveT }, refPt1);
                            let pt2 = PointToGlobal({ x: 0, y: -paveT }, refPt2);
                            let l1 = { ...refPt1, ...pt1 };
                            let l2 = { ...refPt2, ...pt2 };
                            // let l1 = PointToGlobal({ x: 0, y: -paveT }, refPt1);
                            // let l2 = PointToGlobal({ x: 0, y: -paveT }, refPt2);
                            pts.push(l1);
                            section.points.forEach(pt => pts.push(PointToGlobal(pt, GetRefPoint(l1))));
                            pts.push(l2);
                            let sectionPt = [{ x: l1.offset, y: l1.z - mainPoint.z }];
                            section.points.forEach(pt => sectionPt.push({ x: l1.offset + pt.x, y: l1.z - mainPoint.z + pt.y }));
                            sectionPt.push({ x: l2.offset, y: l2.z - mainPoint.z });
                            //향후 loftCut을 통해서 단면요소 생성
                            let barrierSectionDraw = new Line(sectionPt, "WHITE", false, null);
                            barrierSectionDraw.sectionName = key;
                            section2DBarrier["model"]["sectionView"].push(barrierSectionDraw);
                            section2DBarrier["dimension"]["topView"].push({ sectionName: key, points: [pts[0], pts[pts.length - 1]] });
                            section2DBarrier["dimension"]["sectionView"].push({ x: l1.offset, y: 0 }, { x: l2.offset, y: 0 });
                            lowPt.push(pts[0], pts[pts.length - 1]);
                            upperPt.push(pts[1], pts[pts.length - 2]);
                            lowPt2D.push(sectionPt[0], sectionPt[sectionPt.length - 1]);
                            upperPt2D.push(sectionPt[1], sectionPt[sectionPt.length - 2]);
                            new_BarrierData[key].points.push(pts);
                        } else {
                            //슬래브 우측인경우
                            let rLine1 = LineToOffsetSpline(rGirderLine, rightOffset - barrierLayout[b]["offset"]);
                            let rLine2 = LineToOffsetSpline(rGirderLine, rightOffset - barrierLayout[b]["offset"] - section.w);
                            let refPt1 = GetRefPoint(IntersectionPointOnSpline(rLine1, mainPoint, alignment));
                            let coord1 = PointToGlobal({ x: 0, y: -paveT }, refPt1);
                            let l1 = { ...refPt1, ...coord1 };
                            pts.push(l1);
                            section.points.forEach(pt => pts.push(PointToGlobal(pt, GetRefPoint(l1))));
                            let refPt2 = GetRefPoint(IntersectionPointOnSpline(rLine2, mainPoint, alignment));
                            let coord2 = PointToGlobal({ x: 0, y: -paveT }, refPt2);
                            let l2 = { ...refPt2, ...coord2 };
                            pts.push(l2);
                            let sectionPt = [{ x: l1.offset, y: l1.z - mainPoint.z }];
                            section.points.forEach(pt => sectionPt.push({ x: l1.offset + pt.x, y: l1.z - mainPoint.z + pt.y }));
                            sectionPt.push({ x: l2.offset, y: l2.z - mainPoint.z });
                            let barrierSectionDraw = new Line(sectionPt, "WHITE", false, null);
                            barrierSectionDraw.sectionName = key;
                            section2DBarrier["model"]["sectionView"].push(barrierSectionDraw);
                            section2DBarrier["dimension"]["topView"].push({ sectionName: key, points: [pts[pts.length - 1], pts[0]] });
                            section2DBarrier["dimension"]["sectionView"].push({ x: l2.offset, y: 0 }, { x: l1.offset, y: 0 });
                            lowPt.push(pts[pts.length - 1], pts[0]);
                            upperPt.push(pts[pts.length - 2], pts[1]);
                            lowPt2D.push(sectionPt[sectionPt.length - 1], sectionPt[0]);
                            upperPt2D.push(sectionPt[sectionPt.length - 2], sectionPt[1]);
                            new_BarrierData[key].points.push(pts);
                        }
                    } else if (barrierLayout[b]["type"].includes("보도")) {
                        //보도부
                        if (!new_PavementData.hasOwnProperty(key)) {
                            new_PavementData[key] = new Loft([], true, "Pavement", { key: "pavement", part: key });
                            // new_PavementData[key] = {
                            //     type: "loft",
                            //     points: [],
                            //     cap: true,
                            //     closed: true,
                            //     meta: { key: "pavement", part: key },
                            //     get threeFunc() {
                            //         return InitPoint => LoftModelView(this.points, this.closed, this.cap, this.ptGroup, InitPoint);
                            //     },
                            // };
                        }
                        if (barrierLayout[b]["from"] === "슬래브좌측") {
                            pede.push({ key, isLeft: false, slope: barrierLayout[b]["offset"], index: lowPt.length - 1 });
                        } else {
                            //슬래브 우측기준
                            pede.push({ key, isLeft: true, slope: barrierLayout[b]["offset"], index: lowPt.length - 1 });
                        }
                    } else {
                        //포장부
                        if (!new_PavementData.hasOwnProperty(key)) {
                            // before_pavement[key] = { type: "loft", points: [], cap: true, ptGroup: [], closed: false };
                            new_PavementData[key] = new Loft([], false, "Pavement", { key: "pavement", part: key });
                            // new_PavementData[key] = {
                            //     type: "loft",
                            //     points: [],
                            //     cap: false,
                            //     ptGroup: [],
                            //     closed: false,
                            //     meta: { key: "pavement", part: key },
                            //     get threeFunc() {
                            //         return InitPoint => LoftModelView(this.points, this.closed, this.cap, this.ptGroup, InitPoint);
                            //     },
                            // };
                        }
                        pave.push({ key, index: lowPt.length - 1 });
                    }
                }
                for (let p in pede) {
                    let pts, pts2D;
                    let dz = (Math.abs(lowPt[pede[p].index].offset - lowPt[pede[p].index + 1].offset) * pede[p].slope) / 100;
                    if (pede[p].isLeft) {
                        pts = [
                            lowPt[pede[p].index],
                            upperPt[pede[p].index],
                            { x: upperPt[pede[p].index + 1].x, y: upperPt[pede[p].index + 1].y, z: upperPt[pede[p].index].z + dz },
                            lowPt[pede[p].index + 1],
                        ];
                        pts2D = [
                            lowPt2D[pede[p].index],
                            upperPt2D[pede[p].index],
                            { x: upperPt2D[pede[p].index + 1].x, y: upperPt2D[pede[p].index].y + dz },
                            lowPt2D[pede[p].index + 1],
                        ];
                    } else {
                        pts = [
                            lowPt[pede[p].index],
                            { x: upperPt[pede[p].index].x, y: upperPt[pede[p].index].y, z: upperPt[pede[p].index + 1].z + dz },
                            upperPt[pede[p].index + 1],
                            lowPt[pede[p].index + 1],
                        ];
                        pts2D = [
                            lowPt2D[pede[p].index],
                            { x: upperPt2D[pede[p].index].x, y: upperPt2D[pede[p].index + 1].y + dz },
                            upperPt2D[pede[p].index + 1],
                            lowPt2D[pede[p].index + 1],
                        ];
                    }
                    section2DPavement["model"]["sectionView"].push(new Line(pts2D, "GRAY", false, null));
                    new_PavementData[pede[p].key].points.push(pts.reverse());
                }
                for (let p in pave) {
                    let pts, pts2D;
                    if (lowPt[pave[p].index].offset * lowPt[pave[p].index + 1].offset < 0) {
                        pts = [
                            lowPt[pave[p].index],
                            { x: lowPt[pave[p].index].x, y: lowPt[pave[p].index].y, z: lowPt[pave[p].index].z + paveT },
                            { x: mainPoint.x, y: mainPoint.y, z: mainPoint.z },
                            { x: lowPt[pave[p].index + 1].x, y: lowPt[pave[p].index + 1].y, z: lowPt[pave[p].index + 1].z + paveT },
                            lowPt[pave[p].index + 1],
                            // masterPoint,
                        ];
                        pts2D = [
                            lowPt2D[pave[p].index],
                            { x: lowPt2D[pave[p].index].x, y: lowPt2D[pave[p].index].y + paveT },
                            { x: 0, y: 0 },
                            { x: lowPt2D[pave[p].index + 1].x, y: lowPt2D[pave[p].index + 1].y + paveT },
                            lowPt2D[pave[p].index + 1],
                        ];
                    } else {
                        pts = [
                            lowPt[pave[p].index],
                            { x: lowPt[pave[p].index].x, y: lowPt[pave[p].index].y, z: lowPt[pave[p].index].z + paveT },
                            { x: lowPt[pave[p].index + 1].x, y: lowPt[pave[p].index + 1].y, z: lowPt[pave[p].index + 1].z + paveT },
                            lowPt[pave[p].index + 1],
                        ];
                        pts2D = [
                            lowPt2D[pave[p].index],
                            { x: lowPt2D[pave[p].index].x, y: lowPt2D[pave[p].index].y + paveT },
                            { x: lowPt2D[pave[p].index + 1].x, y: lowPt2D[pave[p].index + 1].y + paveT },
                            lowPt2D[pave[p].index + 1],
                        ];
                    }
                    section2DPavement["model"]["sectionView"].push(new Line(pts2D, "GRAY", false, null));
                    new_PavementData[pave[p].key].points.push(pts.reverse());
                }

                newbarrierDict["parent"].push(section2DBarrier);
                newpavementDict["parent"].push(section2DPavement);
            }
        }
        if (centerLineStations[i].key === "CRK7") {
            isSlab = false;
        }
    }
    //곡률이 과다한 경우 리스트의 순서가 바뀔 우려가 있음 210128 by drlim
    for (let i in new_BarrierData) {
        newbarrierDict["children"].push(new_BarrierData[i]);
    }
    for (let i in new_PavementData) {
        newpavementDict["children"].push(new_PavementData[i]);
    }
    return { barrierModel: newbarrierDict, pavementModel: newpavementDict, barrierLoad, paveLoad, pedeLoad };
}

//GetHaunchPointsOnUF는 상부플랜지 헌치의 하단좌표를 출력하는 함수임
function GetHaunchPointsOnUF(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isHaunch = true) {
    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    let points = [];
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = GetPointSectionInfo(station, skew, gridInput, girderIndex, pointDict); // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = girderBaseInfo.common.T
        ? { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H, UL: girderBaseInfo.common.T / 2, UR: girderBaseInfo.common.T / 2 }
        : { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 };
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: -sectionInfo.UL, y: -centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = GetWebPoint(lwb, lwt, gradient, -topY); //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = GetWebPoint(rwb, rwt, gradient, -topY); //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC - w1, lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1];
    let hl = [];
    if (isHaunch) {
        wx.forEach(x => hl.push(Math.abs(hh + (-gradient + girderPoint.gradientY) * x)));
    } else {
        wx.forEach(x => hl.push(0));
    }
    let hpt = []; //헌치포인트
    let wpt = []; //플렌지 돌출길이 포인트
    const constant = [-3, 3, 3, -3]; //루프계산을 위한 계수 모음, 헌치의 기울기 : 밑변/높이비
    for (let i = 0; i < wx.length; i++) {
        if (isHaunch) {
            hpt.push({
                x: wx[i] + hl[i] * constant[i],
                y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[i] + hl[i] * constant[i]),
            });
        } else {
            hpt.push({ x: wx[i], y: -topY + gradient * wx[i] });
        }
        wpt.push({ x: wx[i], y: -topY + gradient * wx[i] });
    }
    if (wx[1] > wx[3]) {
        //임시로 작성한 내용, 개구 폐합에서는 잘못된 3차원 메쉬가 생성됨 200602 by drlim
        wpt[1] = wpt[0];
        wpt[3] = wpt[2];
        hpt[1] = wpt[0];
        hpt[3] = wpt[2];
    }
    points = [...hpt, ...wpt];
    points.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    return points;
}

function GetHaunchPointsOnUF2(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isForward) {
    //상부플랜지 단면변화부용
    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    let points = [];
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = GetPointSectionInfo(station, skew, gridInput, girderIndex, pointDict); // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 };
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: -sectionInfo.UL, y: -centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = GetWebPoint(lwb, lwt, gradient, -topY); //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = GetWebPoint(rwb, rwt, gradient, -topY); //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC - w1, lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1];
    let hl = [];
    wx.forEach(x => hl.push(Math.abs(hh + (-gradient + girderPoint.gradientY) * x)));
    let hpt = [];
    let wpt = [];
    const constant = [-3, 3, 3, -3]; //루프계산을 위한 계수 모음, 헌치의 기울기 : 밑변/높이비
    for (let i = 0; i < wx.length; i++) {
        hpt.push({
            x: wx[i] + hl[i] * constant[i],
            y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[i] + hl[i] * constant[i]),
            z: 0,
        });
        wpt.push({ x: wx[i], y: -topY + gradient * wx[i], z: 0 });
    }
    if (wx[1] > wx[3]) {
        //임시로 작성한 내용, 개구 폐합에서는 잘못된 3차원 메쉬가 생성됨 200602 by drlim
        wpt[1] = wpt[0];
        wpt[3] = wpt[2];
        hpt[1] = wpt[0];
        hpt[3] = wpt[2];
    }
    if (isForward) {
        hpt[1].z = hl[1] * -3;
        hpt[3].z = hl[3] * -3;
    } else {
        hpt[1].z = hl[1] * 3;
        hpt[3].z = hl[3] * 3;
    }
    let points2 = [...hpt, ...wpt];

    // 추가된 부분 //
    hpt[1] = wpt[1];
    hpt[3] = wpt[3];

    points = [...hpt, ...wpt];
    points.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    points2.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    return { points, points2 };
}

function GetHaunchPointsOnUF3(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isLeft, isRight) {
    //가로보 헌치부 용
    let slabToGirder = true; // girderBaseInfo.end.isStraight;
    let points = [];
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = GetPointSectionInfo(station, skew, gridInput, girderIndex, pointDict); // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 };
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: -sectionInfo.UL, y: -centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = GetWebPoint(lwb, lwt, gradient, -topY); //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = GetWebPoint(rwb, rwt, gradient, -topY); //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC - w1, lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1];
    let hl = [];
    wx.forEach(x => hl.push(Math.abs(hh + (-gradient + girderPoint.gradientY) * x)));
    let hpt = [];
    let wpt = [];
    let hpt2 = [];
    let wpt2 = [];

    const constant = [-3, 3, 3, -3]; //루프계산을 위한 계수 모음, 헌치의 기울기 : 밑변/높이비
    const slabWidth = 300; //임시로 정의, 향후 가로보 상부플랜지 폭을 변수로 받아와야 함 210202 by Dr.Lim
    for (let i = 0; i < wx.length; i++) {
        hpt.push({
            x: wx[i] + hl[i] * constant[i],
            y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[i] + hl[i] * constant[i]),
        });
        wpt.push({ x: wx[i], y: -topY + gradient * wx[i] });
        hpt2.push({
            x: wx[i] + hl[i] * constant[i],
            y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[i] + hl[i] * constant[i]),
        });
        wpt2.push({ x: wx[i], y: -topY + gradient * wx[i] });
    }
    if (wx[1] > wx[3]) {
        //임시로 작성한 내용, 개구 폐합에서는 잘못된 3차원 메쉬가 생성됨 200602 by drlim
        wpt[1] = wpt[0];
        wpt[3] = wpt[2];
        hpt[1] = wpt[0];
        hpt[3] = wpt[2];
        wpt2[1] = wpt2[0];
        wpt2[3] = wpt2[2];
        hpt2[1] = wpt2[0];
        hpt2[3] = wpt2[2];
    }
    // 추가된 부분 //
    if (isLeft) {
        hpt[0].z = slabWidth / 2 + w1 + hl[0] * 3;
        wpt[0].z = slabWidth / 2 + w1;
        hpt2[0].z = -1 * (slabWidth / 2 + w1 + hl[0] * 3);
        wpt2[0].z = -1 * (slabWidth / 2 + w1);
    }
    if (isRight) {
        hpt[2].z = slabWidth / 2 + w1 + hl[2] * 3;
        wpt[2].z = slabWidth / 2 + w1;
        hpt2[2].z = -1 * (slabWidth / 2 + w1 + hl[2] * 3);
        wpt2[2].z = -1 * (slabWidth / 2 + w1);
    }
    let points2 = [...hpt, ...wpt];
    let points4 = [...hpt2, ...wpt2];

    if (isLeft) {
        hpt[0] = wpt[0];
        hpt2[0] = wpt2[0];
    }
    if (isRight) {
        hpt[2] = wpt[2];
        hpt2[2] = wpt2[2];
    }
    points = [...hpt, ...wpt];
    let points3 = [...hpt2, ...wpt2];

    points.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    points2.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    points3.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    points4.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    return { points, points2, points3, points4 };
}

function GetLowerSlabCantilPoints(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isHaunch = true) {
    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    let points = [];
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = GetPointSectionInfo(station, skew, gridInput, girderIndex, pointDict); // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = girderBaseInfo.common.T
        ? { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H, UL: girderBaseInfo.common.T / 2, UR: girderBaseInfo.common.T / 2 }
        : { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 };
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: -sectionInfo.UL, y: -centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = GetWebPoint(lwb, lwt, gradient, -topY); //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = GetWebPoint(rwb, rwt, gradient, -topY); //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    // let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC - w1, rw2.x + ps.uFlangeC + w1];
    let hpt = [{ x: wx[0], y: -topY + gradient * wx[0] }, lw2, rw2, { x: wx[1], y: -topY + gradient * wx[1] }];
    return hpt;
}

function GetLowerSlabPoints(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isHaunch = true) {
    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = GetPointSectionInfo(station, skew, gridInput, girderIndex, pointDict); // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = girderBaseInfo.common.T
        ? { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H, UL: girderBaseInfo.common.T / 2, UR: girderBaseInfo.common.T / 2 }
        : { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 };
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: -sectionInfo.UL, y: -centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = GetWebPoint(lwb, lwt, gradient, -topY); //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = GetWebPoint(rwb, rwt, gradient, -topY); //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1];
    let hl = [];

    let hpt = []; //헌치포인트
    // let wpt = []; //플렌지 돌출길이 포인트
    if (isHaunch && wx[0] < wx[1]) {
        wx.forEach(x => hl.push(Math.abs(hh + (-gradient + girderPoint.gradientY) * x)));
        hpt = [
            lw2,
            { x: wx[0], y: -topY + gradient * wx[0] },
            { x: wx[0] + 3 * hl[0], y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[0] + 3 * hl[0]) },
            { x: wx[1] - 3 * hl[1], y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[1] - 3 * hl[1]) },
            { x: wx[1], y: -topY + gradient * wx[1] },
            rw2,
        ];
    } else {
        if (wx[0] >= wx[1]) {
            hpt = [
                lw2,
                { x: lw2.x + sectionInfo.B / 4, y: -topY + gradient * (lw2.x + sectionInfo.B / 4) },
                { x: lw2.x + sectionInfo.B / 4, y: -topY + gradient * (lw2.x + sectionInfo.B / 4) },
                { x: rw2.x - sectionInfo.B / 4, y: -topY + gradient * (rw2.x - sectionInfo.B / 4) },
                { x: rw2.x - sectionInfo.B / 4, y: -topY + gradient * (rw2.x - sectionInfo.B / 4) },
                rw2,
            ];
        } else {
            hpt = [
                lw2,
                { x: wx[0], y: -topY + gradient * wx[0] },
                { x: wx[0], y: -topY + gradient * wx[0] },
                { x: wx[1], y: -topY + gradient * wx[1] },
                { x: wx[1], y: -topY + gradient * wx[1] },
                rw2,
            ];
        }
    }
    return hpt;
}

function GetLowerSlabOpenPoints(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isForward) {
    //상부플랜지 단면변화부용

    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = GetPointSectionInfo(station, skew, gridInput, girderIndex, pointDict); // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 };
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: -sectionInfo.UL, y: -centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = GetWebPoint(lwb, lwt, gradient, -topY); //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = GetWebPoint(rwb, rwt, gradient, -topY); //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1];
    // let wx = [lw2.x - ps.uFlangeC - w1, lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1]
    let hl = [];
    wx.forEach(x => hl.push(Math.abs(hh + (-gradient + girderPoint.gradientY) * x)));
    let sign = isForward ? -1 : 1;
    let hpt = [
        lw2,
        { x: wx[0], y: -topY + gradient * wx[0] },
        {
            x: wx[0] + 3 * hl[0],
            y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[0] + 3 * hl[0]),
            z: sign * 3 * hl[0],
        },
        {
            x: wx[1] - 3 * hl[1],
            y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[1] - 3 * hl[1]),
            z: sign * 3 * hl[1],
        },
        { x: wx[1], y: -topY + gradient * wx[1] },
        rw2,
    ];
    let hpt2 = [
        lw2,
        { x: wx[0], y: -topY + gradient * wx[0] },
        { x: wx[0], y: -topY + gradient * wx[0] },
        { x: wx[1], y: -topY + gradient * wx[1] },
        { x: wx[1], y: -topY + gradient * wx[1] },
        rw2,
    ];
    if (isForward) {
        return [hpt2, hpt];
    } else {
        return [hpt, hpt2];
    }
}

function GetLowerSlabXbeamPoints(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, xbeamWidth, sec, isHaunch = true) {
    //가로보 헌치부 용
    let slabToGirder = true; // girderBaseInfo.end.isStraight;
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = GetPointSectionInfo(station, skew, gridInput, girderIndex, pointDict); // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 };
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: -sectionInfo.UL, y: -centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = GetWebPoint(lwb, lwt, gradient, -topY); //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = GetWebPoint(rwb, rwt, gradient, -topY); //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC - w1, lw2.x, rw2.x, rw2.x + ps.uFlangeC + w1];
    let hl = [];
    wx.forEach(x => hl.push(Math.abs(hh + (-gradient + girderPoint.gradientY) * x)));
    let hpt = [];
    let wpt = [];
    let hpt2 = [];
    let wpt2 = [];

    let dx0 = wx[0] - 3 * hl[0];
    let dx1 = wx[0];
    let dx2 = wx[3];
    let dx3 = wx[3] + 3 * hl[3];

    let z0 = (xbeamWidth / 2 + w1 + hl[0] * 3) * sec;
    let z1 = (xbeamWidth / 2 + w1) * sec;
    let z3 = (xbeamWidth / 2 + w1 + hl[3] * 3) * sec;

    hpt.push(
        { x: dx0, y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx0, z: z0 },
        { x: dx1, y: -topY + gradient * dx1, z: z1 },
        { x: lw2.x, y: lw2.y, z: z1 },
        { x: rw2.x, y: rw2.y, z: z1 },
        { x: dx2, y: -topY + gradient * dx2, z: z1 },
        { x: dx3, y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx3, z: z3 }
    );
    wpt.push(
        { x: dx1, y: -topY + gradient * dx1, z: z1 },
        { x: dx1, y: -topY + gradient * dx1, z: z1 },
        { x: lw2.x, y: lw2.y, z: z1 },
        { x: rw2.x, y: rw2.y, z: z1 },
        { x: dx2, y: -topY + gradient * dx2, z: z1 },
        { x: dx2, y: -topY + gradient * dx2, z: z1 }
    );
    wpt2.push(
        { x: dx1, y: -topY + gradient * dx1, z: -z1 },
        { x: dx1, y: -topY + gradient * dx1, z: -z1 },
        { x: lw2.x, y: lw2.y, z: -z1 },
        { x: rw2.x, y: rw2.y, z: -z1 },
        { x: dx2, y: -topY + gradient * dx2, z: -z1 },
        { x: dx2, y: -topY + gradient * dx2, z: -z1 }
    );
    hpt2.push(
        { x: dx0, y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx0, z: -z0 },
        { x: dx1, y: -topY + gradient * dx1, z: -z1 },
        { x: lw2.x, y: lw2.y, z: -z1 },
        { x: rw2.x, y: rw2.y, z: -z1 },
        { x: dx2, y: -topY + gradient * dx2, z: -z1 },
        { x: dx3, y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx3, z: -z3 }
    );
    let points = [hpt.slice(0, 3), wpt.slice(0, 3), wpt2.slice(0, 3), hpt2.slice(0, 3)];
    let points2 = [hpt.slice(3), wpt.slice(3), wpt2.slice(3), hpt2.slice(3)];

    let left0 = isHaunch
        ? [
              { x: dx0, y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx0, z: 0 },
              { x: dx1, y: -topY + gradient * dx1, z: 0 },
              { x: lw2.x, y: lw2.y, z: 0 },
          ]
        : [
              { x: dx1, y: -topY + gradient * dx1, z: 0 },
              { x: dx1, y: -topY + gradient * dx1, z: 0 },
              { x: lw2.x, y: lw2.y, z: 0 },
          ];
    let right0 = isHaunch
        ? [
              { x: rw2.x, y: rw2.y, z: 0 },
              { x: dx2, y: -topY + gradient * dx2, z: 0 },
              { x: dx3, y: -ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx3, z: 0 },
          ]
        : [
              { x: rw2.x, y: rw2.y, z: 0 },
              { x: dx2, y: -topY + gradient * dx2, z: 0 },
              { x: dx2, y: -topY + gradient * dx2, z: 0 },
          ];
    return { left: points, right: points2, left0, right0 };
}

const barrierFnMap = {
    "방호벽B(좌)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: w, y: h },
        ];
    },
    "방호벽B(우)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: -w, y: h },
        ];
    },
    "사각블럭(우)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: -w, y: h },
        ];
    },
    "사각블럭(좌)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: w, y: h },
        ];
    },
    "방호벽A(좌)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: w - 190, y: h },
            { x: w - 120, y: 380 },
            { x: w, y: 200 },
        ];
    },
    "방호벽A(우)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: -(w - 190), y: h },
            { x: -(w - 120), y: 380 },
            { x: -w, y: 200 },
        ];
    },
};
