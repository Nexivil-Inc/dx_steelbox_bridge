import { TwoPointsLength } from "@nexivil/package-modules";

export function GenFlangeQuantity(pointsList) {
    let data = [];
    let area = 0;
    for (let p in pointsList) {
        area = 0;
        for (let i = 0; i < pointsList[p].length; i++) {
            let k = i === pointsList[p].length - 1 ? 0 : i + 1;
            area += ((pointsList[p][k].x - pointsList[p][i].x) * (pointsList[p][i].y + pointsList[p][k].y)) / 2;
        }
        if (area > 0) {
            let bound = MinimumRectangleBound2D(pointsList[p]);
            data.push({
                area: area,
                w: bound.height.toFixed(0),
                l: bound.length.toFixed(0),
            });
        }
    }
    return data;
}

export function GenWebQuantity(steelBoxPoints, sectionPointNum, index1, index2) {
    let data = [];
    let pointsList = [];
    let centerPoint = [];
    let area = 0;
    let ptsL1 = [];
    let ptsR1 = [];
    let ptsC1 = [];
    let ptsL2 = [];
    let ptsR2 = [];
    let ptsC2 = [];
    for (let j in steelBoxPoints) {
        let pts1 = [];
        let pts2 = [];
        for (let i in steelBoxPoints[j]) {
            if (i % sectionPointNum === index1) {
                pts1.push(steelBoxPoints[j][i]);
            } else if (i % sectionPointNum === index2) {
                pts2.push(steelBoxPoints[j][i]);
            }
        }
        if (j == 0) {
            ptsL1.push(...pts1);
            ptsL2.push(...pts2);
        }
        if (j == 1) {
            ptsR1.push(...pts1);
            ptsR2.push(...pts2);
        }
        if (j == 2) {
            ptsC1.push(...pts1);
            ptsC2.push(...pts2);
        }
    }
    let nPL = [];
    let nPR = [];
    let nPC = [];
    if (ptsC1.length > 0 && ptsL1.length > 0 && ptsR1.length > 0) {
        if (ptsC1[0].x === ptsL1[ptsL1.length - 1].x && ptsC1[0].y === ptsL1[ptsL1.length - 1].y) {
            // 개구 뒤에 폐합이 오는 경우
            let initPL = { x: 0, y: 0 };
            let angL = 0;
            let initPR = { x: TwoPointsLength(ptsC1[0], ptsC2[0]), y: 0 };
            let angR = Math.PI;
            nPC = SteelBoxToFlatPlate(ptsC1, ptsC2, initPL, angL, true);
            nPL = SteelBoxToFlatPlate(ptsL1.reverse(), ptsL2.reverse(), initPL, angL, false);
            nPR = SteelBoxToFlatPlate(ptsR1.reverse(), ptsR2.reverse(), initPR, angR, true);
            let points = [...nPL[0].reverse(), ...nPC[0], ...nPC[1].reverse(), ...nPR[0], ...nPR[1].reverse(), ...nPL[1]];
            pointsList.push(points);
            // result.push(ToLine(points, color, true));
        } else {
            // 개구 앞에 폐합이 오는 경우
            let initPL = { x: 0, y: 0 };
            let angL = 0;
            let initPR = { x: TwoPointsLength(ptsC1[ptsC1.length - 1], ptsC2[ptsC2.length - 1]), y: 0 };
            let angR = Math.PI;
            nPC = SteelBoxToFlatPlate(ptsC1.reverse(), ptsC2.reverse(), initPL, angL, false);
            nPL = SteelBoxToFlatPlate(ptsL1, ptsL2, initPL, angL, true);
            nPR = SteelBoxToFlatPlate(ptsR1, ptsR2, initPR, angR, false);
            let points = [...nPL[0].reverse(), ...nPC[0], ...nPC[1].reverse(), ...nPR[0], ...nPR[1].reverse(), ...nPL[1]];
            points.reverse(); //상기코드가 반시계방향으로 폴리곤을 생성하고 있음
            pointsList.push(points);
            // result.push(ToLine(points, color, true));
        }
    } else if (ptsC1.length === 0 && ptsL1.length > 0 && ptsR1.length > 0) {
        nPL = SteelBoxToFlatPlate(ptsL1, ptsL2);
        let nPtsL = [...nPL[0], ...nPL[1].reverse()];
        pointsList.push(nPtsL);
        nPR = SteelBoxToFlatPlate(ptsR1, ptsR2);
        let nPtsR = [...nPR[0], ...nPR[1].reverse()];
        pointsList.push(nPtsR);
    } else {
        nPC = SteelBoxToFlatPlate(ptsC1, ptsC2);
        let nPtsC = [...nPC[0], ...nPC[1].reverse()];
        pointsList.push(nPtsC);
    }
    for (let p in pointsList) {
        area = 0;
        for (let i = 0; i < pointsList[p].length; i++) {
            let k = i === pointsList[p].length - 1 ? 0 : i + 1;
            area += ((pointsList[p][k].x - pointsList[p][i].x) * (pointsList[p][i].y + pointsList[p][k].y)) / 2;
        }
        if (area > 0) {
            let bound = MinimumRectangleBound2D(pointsList[p]);
            data.push({
                area: area,
                w: bound.height.toFixed(0),
                l: bound.length.toFixed(0),
            });
        }
    }
    return data;
}

export function GenRibQuantity(steelBoxRibPoints, sectionPointNum, index1, index2) {
    let data = [];
    let pointsList = [];
    let area = 0;
    for (let j in steelBoxRibPoints) {
        let pts1 = [];
        let pts2 = [];
        for (let i in steelBoxRibPoints[j]) {
            if (i % sectionPointNum === index1) {
                pts1.push(steelBoxRibPoints[j][i]);
            } else if (i % sectionPointNum === index2) {
                pts2.push(steelBoxRibPoints[j][i]);
            }
        }
        let initPL = { x: 0, y: 0 };
        let angL = 0;
        let nPt = SteelBoxToFlatPlate(pts1, pts2, initPL, angL, true);
        let points = [...nPt[0], ...nPt[1].reverse()];
        pointsList.push(points);
    }
    for (let p in pointsList) {
        area = 0;
        for (let i = 0; i < pointsList[p].length; i++) {
            let k = i === pointsList[p].length - 1 ? 0 : i + 1;
            area += ((pointsList[p][k].x - pointsList[p][i].x) * (pointsList[p][i].y + pointsList[p][k].y)) / 2;
        }
        if (area > 0) {
            let bound = MinimumRectangleBound2D(pointsList[p]);
            data.push({
                area: area,
                w: bound.height.toFixed(0),
                l: bound.length.toFixed(0),
            });
        }
    }
    return data;
}

function MinimumRectangleBound2D(points) {
    let ang = 0;
    let angList = [];
    let k = 0;
    let area = Infinity;
    let length = 0;
    let height = 0;
    let pt = { x: 0, y: 0, z: 0 };
    // let centerPoint = {}
    for (let i = 0; i < points.length; i++) {
        k = i === points.length - 1 ? 0 : i + 1;
        let dx = points[k].x - points[i].x;
        let dy = points[k].y - points[i].y;
        if (dx !== 0 || dy !== 0) {
            angList.push(Math.atan2(dy, dx)); //회전각에 문제가 있는 듯함
        }
    }
    for (let i in angList) {
        let cos = Math.cos(angList[i]); //회전각도 반대로 회전시켜줘야하는데...
        let sin = Math.sin(angList[i]); //회전각도 반대로 회전시켜줘야하는데...
        let xList = [];
        let yList = [];
        points.forEach(function (pt) {
            xList.push(pt.x * cos - pt.y * sin);
            yList.push(pt.y * cos + pt.x * sin);
        });
        let xMax = Math.max(...xList);
        let yMax = Math.max(...yList);
        let xMin = Math.min(...xList);
        let yMin = Math.min(...yList);
        let x = xMax - xMin;
        let y = yMax - yMin;
        if (x * y < area) {
            area = x * y;
            ang = x > y ? angList[i] : angList[i] + Math.PI / 2;
            if (ang > Math.PI / 2) {
                ang -= Math.PI;
            }
            if (ang <= -Math.PI / 2) {
                ang += Math.PI;
            }
            length = x > y ? x : y;
            height = x > y ? y : x;
            pt.x = cos * (xMin + 0.5 * x) + sin * (yMin + 0.5 * y);
            pt.y = cos * (yMin + 0.5 * y) - sin * (xMin + 0.5 * x);
            // centerPoint = {x : (xMax + xMin)/2, y : (yMax + yMin)/2}
        }
    }
    return { length, height, angle: ang, center: pt };
}

function SteelBoxToFlatPlate(ptsL1, ptsL2, initPt, initAng, isForward) {
    let sign = isForward === false ? -1 : 1;
    let nPL1 = [];
    let nPL2 = [];
    let pt = {};
    let l1 = 0;
    let l2 = 0;
    let l3 = 0;
    let v1 = [];
    let v2 = [];
    let v3 = [];
    let ang = initAng ? initAng : 0;
    for (let i = 0; i < ptsL1.length - 1; i++) {
        if (i === 0) {
            l1 = TwoPointsLength(ptsL1[0], ptsL2[0]);
            v1 = [ptsL2[0].x - ptsL1[0].x, ptsL2[0].y - ptsL1[0].y, ptsL2[0].z - ptsL1[0].z];
            pt = initPt ? initPt : { x: 0, y: 0 };
            nPL1.push(pt);
        } else {
            l1 = l3;
            v1 = v3;
        }
        l2 = TwoPointsLength(ptsL1[i + 1], ptsL2[i]);
        l3 = TwoPointsLength(ptsL1[i + 1], ptsL2[i + 1]);
        v2 = [ptsL1[i + 1].x - ptsL2[i].x, ptsL1[i + 1].y - ptsL2[i].y, ptsL1[i + 1].z - ptsL2[i].z];
        v3 = [ptsL2[i + 1].x - ptsL1[i + 1].x, ptsL2[i + 1].y - ptsL1[i + 1].y, ptsL2[i + 1].z - ptsL1[i + 1].z];
        pt = { x: pt.x + Math.cos(ang) * l1, y: pt.y + Math.sin(ang) * l1 };
        nPL2.push(pt); //
        if (l1 === 0 || l2 === 0) {
        } else {
            let dotVec = Math.min(1, Math.max(-1, (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (l1 * l2)));
            ang = ang + sign * Math.acos(dotVec);
        }
        pt = { x: pt.x + Math.cos(ang) * l2, y: pt.y + Math.sin(ang) * l2 };
        nPL1.push(pt);
        if (l2 === 0 || l3 === 0) {
        } else {
            let dotVec = Math.min(1, Math.max(-1, (v2[0] * v3[0] + v2[1] * v3[1] + v2[2] * v3[2]) / (l2 * l3)));
            ang = ang - sign * Math.acos(dotVec);
        }
        if (i === ptsL1.length - 2) {
            pt = { x: pt.x + Math.cos(ang) * l3, y: pt.y + Math.sin(ang) * l3 };
            nPL2.push(pt);
        }
    }
    return [nPL1, nPL2];
}
