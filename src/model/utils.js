import { Extrude_rev, GetRefPoint, Hatch, Line, PointToGlobal, TwoPointsLength } from "@nexivil/package-modules";
import { THREE } from "global";
import { CubeReflectionMapping } from "three";

export function GenHPlate(
    points,
    centerPoint,
    thickness,
    z,
    skew,
    xRotation,
    yRotation,
    points2D,
    top2D,
    side2D,
    bottom2D,
    holes = [],
    meta = {},
    add = {}
) {
    const cosec = 1 / Math.sin(skew);
    const cot = -1 / Math.tan(skew);
    // let refPoint = GetRefPoint({ ...centerPoint, skew},true);

    const rotationY = yRotation;
    const rotationX = xRotation;
    let cos = Math.cos(rotationY);
    let cosx = Math.cos(rotationX);
    let resultPoints = [];
    let topView = null;
    let bottomView = null;
    let sideView = null;

    if (rotationY === Math.PI / 2) {
        points.forEach(pt => resultPoints.push({ x: pt.x, y: pt.y }));
    } else {
        points.forEach(pt => resultPoints.push({ x: pt.x, y: pt.x * cot + pt.y * cosec }));
    }

    if (top2D) {
        topView = [];
        if (rotationY < Math.PI / 2 && rotationY > -Math.PI / 2) {
            resultPoints.forEach(function (pt) {
                let gpt = ToGlobalPoint2(centerPoint, { x: pt.x * cos, y: pt.y * cosx });
                topView.push({ x: gpt.x, y: gpt.y });
            });
        } else if (rotationY === Math.PI / 2 || rotationY === -Math.PI / 2) {
            let gpt = PointToGlobal({ x: resultPoints[0].x * cos, y: 0 }, centerPoint);
            for (let i = 0; i < 4; i++) {
                let sign = rotationY > 0 ? 1 : -1;
                let th = i < 2 ? resultPoints[0].y * cosx : resultPoints[3].y * cosx;
                let dx = centerPoint.normalSin * th;
                let dy = centerPoint.normalCos * th;
                let dx2 = 0 < i && i < 3 ? sign * centerPoint.normalCos * z : sign * centerPoint.normalCos * (z + thickness);
                let dy2 = 0 < i && i < 3 ? sign * centerPoint.normalSin * z : sign * centerPoint.normalSin * (z + thickness);
                topView.push({ x: gpt.x - dx + dx2, y: gpt.y + dy + dy2 });
            }
        }
    }

    if (bottom2D) {
        bottomView = [];
        if (rotationY < Math.PI / 2 && rotationY > -Math.PI / 2) {
            resultPoints.forEach(function (pt) {
                let gpt = ToGlobalPoint2(centerPoint, { x: pt.x * cos, y: pt.y * cosx });
                bottomView.push({ x: gpt.x, y: gpt.y });
            });
        } else if (rotationY === Math.PI / 2 || rotationY === -Math.PI / 2) {
            let gpt = PointToGlobal({ x: resultPoints[0].x * cos, y: 0 }, centerPoint);
            for (let i = 0; i < 4; i++) {
                let sign = rotationY > 0 ? 1 : -1;
                let th = i < 2 ? resultPoints[0].y * cosx : resultPoints[3].y * cosx;
                let dx = centerPoint.normalSin * th;
                let dy = centerPoint.normalCos * th;
                let dx2 = 0 < i && i < 3 ? sign * centerPoint.normalCos * z : sign * centerPoint.normalCos * (z + thickness);
                let dy2 = 0 < i && i < 3 ? sign * centerPoint.normalSin * z : sign * centerPoint.normalSin * (z + thickness);
                bottomView.push({ x: gpt.x - dx + dx2, y: gpt.y + dy + dy2 });
            }
        }
    }

    if (side2D || side2D === 0) {
        let cos = Math.cos(rotationX); //종단선형을 미고려
        let sin = Math.sin(rotationX); //종단선형을 미고려
        sideView = [];
        if (rotationY < Math.PI / 4 && rotationY > -Math.PI / 4) {
            let x1 = points[side2D[0]].y;
            let x2 = points[side2D[1]].y;
            let X = centerPoint.girderStation ?? centerPoint.x;
            let Y = centerPoint.dz ? centerPoint.dz : 0; //centerPoint.z; 종단선형을 따르는 경우
            let pts = [
                { x: X + x1 * cos - z * sin, y: Y + x1 * sin + z * cos },
                { x: X + x2 * cos - z * sin, y: Y + x2 * sin + z * cos },
                { x: X + x2 * cos - (thickness + z) * sin, y: Y + x2 * sin + (thickness + z) * cos },
                { x: X + x1 * cos - (thickness + z) * sin, y: Y + x1 * sin + (thickness + z) * cos },
            ];
            pts.forEach(pt => sideView.push(pt));
        } else {
            let dz = 0;
            if (typeof side2D === "number") {
                dz = side2D;
            }
            let X = centerPoint.girderStation;
            let Y = centerPoint.dz ? dz + centerPoint.dz : dz; //centerPoint.z + dz 종단선형을 따르는 경우
            points.forEach(pt => sideView.push({ x: X + pt.y, y: Y + pt.x * Math.sin(rotationY) }));
        }
    }

    let option = {
        refPoint: { ...centerPoint, xRotation: xRotation, yRotation: yRotation },
        initZ: z,
        holes,
    };
    let materialName = "Steel";
    let result = new Extrude_rev(resultPoints, thickness, option, materialName, meta);
    result.model = { sectionView: points2D, topView, sideView, bottomView };
    Object.keys(add).forEach(key => (result[key] = add[key]));
    return result;
}

export function GenVPlate(
    points,
    centerPoint,
    Thickness,
    scallopVertex,
    scallopR,
    urib,
    lrib,
    holePoints,
    top2D,
    side2D,
    bottom2D,
    meta = {},
    add = {}
) {
    let skew = centerPoint.skew;
    let refPoint = GetRefPoint(centerPoint, true);
    refPoint.yRotation = skew - Math.PI / 2;

    const bl = points[0];
    const br = points[1];
    const tl = points[3];
    const tr = points[2];

    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    const gradient2 = (br.y - bl.y) / (br.x - bl.x);

    const cosec = 1 / Math.sin(skew);

    let topView = null;
    let bottomView = null;
    let sideView = null;
    let newHolePoints = [];
    if (holePoints) {
        holePoints.forEach(pt => newHolePoints.push({ x: pt.x * cosec, y: pt.y }));
    }
    if (top2D) {
        let pt1 = { x: points[top2D[0]].x, y: 0 };
        let pt2 = { x: points[top2D[1]].x, y: 0 };
        let gpt1 = PointToGlobal(pt1, refPoint);
        let gpt2 = PointToGlobal(pt2, refPoint);
        let th = (Thickness / 2) * cosec;
        let dx = centerPoint.normalSin * th;
        let dy = centerPoint.normalCos * th;
        topView = [
            { x: gpt1.x - dx, y: gpt1.y + dy },
            { x: gpt1.x + dx, y: gpt1.y - dy },
            { x: gpt2.x + dx, y: gpt2.y - dy },
            { x: gpt2.x - dx, y: gpt2.y + dy },
        ];
    }

    if (bottom2D) {
        let pt1 = { x: points[bottom2D[0]].x, y: 0 };
        let pt2 = { x: points[bottom2D[1]].x, y: 0 };
        let gpt1 = PointToGlobal(pt1, refPoint);
        let gpt2 = PointToGlobal(pt2, refPoint);
        let th = (Thickness / 2) * cosec;
        let dx = centerPoint.normalSin * th;
        let dy = centerPoint.normalCos * th;
        bottomView = [
            { x: gpt1.x - dx, y: gpt1.y + dy },
            { x: gpt1.x + dx, y: gpt1.y - dy },
            { x: gpt2.x + dx, y: gpt2.y - dy },
            { x: gpt2.x - dx, y: gpt2.y + dy },
        ];
    }

    if (side2D || side2D === 0) {
        let dz = centerPoint.dz ? centerPoint.dz : 0; //centerPoint.z //종단선형을 따르는 경우
        let bottomY =
            ((points[side2D[0]].y - points[side2D[1]].y) / (points[side2D[0]].x - points[side2D[1]].x)) * -points[side2D[1]].x +
            points[side2D[1]].y +
            dz;
        let topY =
            ((points[side2D[2]].y - points[side2D[3]].y) / (points[side2D[2]].x - points[side2D[3]].x)) * -points[side2D[3]].x +
            points[side2D[3]].y +
            dz;
        let X = centerPoint.girderStation;
        sideView = [
            { x: X + Thickness / 2, y: bottomY },
            { x: X - Thickness / 2, y: bottomY },
            { x: X - Thickness / 2, y: topY },
            { x: X + Thickness / 2, y: topY },
        ];
    }

    let mainPlate = [];
    points.forEach(pt => mainPlate.push({ x: pt.x * cosec, y: pt.y }));

    let upperPoints = [];
    if (urib) {
        for (let i = 0; i < urib.layout.length; i++) {
            upperPoints.push({
                x: urib.layout[i] * cosec - urib.ribHoleD,
                y: tl.y + gradient * (urib.layout[i] - urib.ribHoleD - tl.x),
            });
            let curve = new THREE.ArcCurve(
                urib.layout[i] * cosec,
                tl.y + gradient * (urib.layout[i] - tl.x) - urib.height,
                urib.ribHoleR,
                Math.PI,
                0,
                false
            );
            let dummyVectors = curve.getPoints(8);
            for (let i = 0; i < dummyVectors.length; i++) {
                upperPoints.push({ x: dummyVectors[i].x, y: dummyVectors[i].y });
            }
            upperPoints.push({
                x: urib.layout[i] * cosec + urib.ribHoleD,
                y: tl.y + gradient * (urib.layout[i] + urib.ribHoleD - tl.x),
            });
        }
    }
    let lowerPoints = [];
    if (lrib) {
        if (lrib.type == 0) {
            for (let i = 0; i < lrib.layout.length; i++) {
                lowerPoints.push({
                    x: lrib.layout[i] * cosec - lrib.ribHoleD,
                    y: bl.y + gradient2 * (lrib.layout[i] - lrib.ribHoleD - bl.x),
                });
                let curve = new THREE.ArcCurve(
                    lrib.layout[i] * cosec,
                    bl.y + gradient2 * (lrib.layout[i] - bl.x) + lrib.height,
                    lrib.ribHoleR,
                    Math.PI,
                    0,
                    true
                );
                let dummyVectors = curve.getPoints(8);
                for (let i = 0; i < dummyVectors.length; i++) {
                    lowerPoints.push({ x: dummyVectors[i].x, y: dummyVectors[i].y });
                }
                lowerPoints.push({
                    x: lrib.layout[i] * cosec + lrib.ribHoleD,
                    y: bl.y + gradient2 * (lrib.layout[i] + lrib.ribHoleD - bl.x),
                });
            }
        } else if (lrib.type === 1) {
            for (let i = 0; i < lrib.layout.length; i++) {
                let dummyPoints = [];
                dummyPoints.push(
                    {
                        x: lrib.layout[i] * cosec - lrib.thickness / 2 - 1,
                        y: bl.y + gradient2 * (lrib.layout[i] - lrib.thickness / 2 - 1 - bl.x),
                    },
                    {
                        x: lrib.layout[i] * cosec - lrib.thickness / 2 - 1,
                        y: bl.y + gradient2 * (lrib.layout[i] - bl.x) + lrib.height + 1,
                    },
                    {
                        x: lrib.layout[i] * cosec + lrib.thickness / 2 + 1,
                        y: bl.y + gradient2 * (lrib.layout[i] - bl.x) + lrib.height + 1,
                    },
                    {
                        x: lrib.layout[i] * cosec + lrib.thickness / 2 + 1,
                        y: bl.y + gradient2 * (lrib.layout[i] + lrib.thickness / 2 + 1 - bl.x),
                    }
                );
                lowerPoints.push(...scallop(bl, dummyPoints[0], dummyPoints[1], 10, 1));
                lowerPoints.push(dummyPoints[1], dummyPoints[2]);
                lowerPoints.push(...scallop(dummyPoints[2], dummyPoints[3], br, 10, 1));
            }
        }
    }
    let resultPoints = [];
    for (let i = 0; i < points.length; i++) {
        if (scallopVertex.includes(i)) {
            let former = i === 0 ? mainPlate.length - 1 : i - 1;
            let latter = i === mainPlate.length - 1 ? 0 : i + 1;
            resultPoints.push(...scallop(mainPlate[former], mainPlate[i], mainPlate[latter], scallopR, 4));
        } else {
            resultPoints.push(mainPlate[i]);
        }
        if (i === 0) {
            resultPoints.push(...lowerPoints);
        } else if (i === 2) {
            resultPoints.push(...upperPoints.reverse());
        }
    }
    const sin = skew === Math.PI ? 1 : Math.sin(skew);
    let sectionPts = [];
    resultPoints.forEach(pt => sectionPts.push({ x: pt.x * sin, y: pt.y }));
    let option = {
        refPoint: { ...refPoint },
        holes: [newHolePoints],
    };
    let materialName = "Steel";
    let result = new Extrude_rev(resultPoints, Thickness, option, materialName, meta);
    result.model = { sectionView: sectionPts, topView, sideView, bottomView };
    Object.keys(add).forEach(key => (result[key] = add[key]));

    return result;
}

export function GenHPlateSide(x1, x2, t, z, cp, rot, th1, th2) {
    let result = [];
    // x1, x2, cp에 대한 rot 회전이전의 상대좌표 x값
    // t 판의 두께, th1, th2, x1,x2 꼭지점의 각(x축기준 시계반대방향각), rot는 시계방향각으로 부호를 반대로 적용
    // 판의 두께는 항상 양수의 값을 가져야 함
    // 글로벌 좌표기준 z방향  offset 거리
    let cos = Math.cos(-rot);
    let sin = Math.sin(-rot);
    let pts = [
        { x: x1, y: z },
        { x: x2, y: z },
        { x: x2 + t / Math.tan(th2), y: t + z },
        { x: x1 + t / Math.tan(th1), y: t + z },
    ];
    pts.forEach(pt => result.push({ x: cp.x + pt.x * cos - pt.y * sin, y: cp.y + pt.x * sin + pt.y * cos }));
    return result;
}

export function GetPlateRestPoint(point1, point2, tan1, tan2, thickness) {
    let x3, x4, y3, y4;
    if (point1.x === point2.x) {
        x3 = point1.x + thickness;
        x4 = point2.x + thickness;
        y3 = tan1 === null ? point1.y : tan1 * (x3 - point1.x) + point1.y;
        y4 = tan2 === null ? point2.y : tan2 * (x4 - point2.x) + point2.y;
    } else {
        let a = (point1.y - point2.y) / (point1.x - point2.x);
        let b = point1.y - a * point1.x;
        let alpha = a === 0 ? thickness : thickness * Math.sqrt(1 + 1 / a ** 2);
        if (Math.abs(1 / tan1) < 0.001) {
            x3 = point1.x;
        } else {
            if (a === 0) {
                x3 = tan1 === null ? point1.x : point1.x + thickness / tan1;
            } else {
                x3 = tan1 === null ? point1.x : (-a * alpha + b + tan1 * point1.x - point1.y) / (tan1 - a);
            }
        }
        if (Math.abs(1 / tan2) < 0.001) {
            x4 = point2.x;
        } else {
            if (a === 0) {
                x4 = tan2 === null ? point2.x : point2.x + thickness / tan2;
            } else {
                x4 = tan2 === null ? point2.x : (-a * alpha + b + tan2 * point2.x - point2.y) / (tan2 - a);
            }
        }
        y3 = a === 0 ? point1.y + thickness : a * (x3 - alpha) + b;
        y4 = a === 0 ? point2.y + thickness : a * (x4 - alpha) + b;
    }
    return [point1, point2, { x: x4, y: y4 }, { x: x3, y: y3 }];
}

export function GetWebPoint(point1, point2, tan1, H) {
    let x;
    let y;
    if (point1.x === point2.x) {
        x = point1.x;
        y = tan1 === null ? null : tan1 * x + H;
    } else {
        let a = (point1.y - point2.y) / (point1.x - point2.x);
        let b = point1.y - a * point1.x;
        x = tan1 === null ? point1.x : (b - H) / (tan1 - a);
        y = a * x + b;
    }
    return { x, y };
}

export function GetWeldingPoint(weldingLine, locate) {
    // <--- 폴리라인 내의 상대위치 좌표 출력함수
    let linelength = [];
    let dummy;
    let totallength = 0;
    let point = {};
    for (let i = 0; i < weldingLine.length - 1; i++) {
        dummy = TwoPointsLength(weldingLine[i], weldingLine[i + 1]);
        totallength += dummy; //웹일 경우에는 제대로 길이를 체크하지 못함
        linelength.push(totallength);
    }

    for (let i = 0; i < linelength.length; i++) {
        if (linelength[i] / totallength >= locate) {
            point["x"] = (1 - locate) * weldingLine[i].x + locate * weldingLine[i + 1].x;
            point["y"] = (1 - locate) * weldingLine[i].y + locate * weldingLine[i + 1].y;
            break;
        }
    }
    return point;
}
export function GetPointSectionInfo(station, skew, gridInput, girderIndex, gridPointDict) {
    let forward = {
        height: 0,
        slabThickness: 0,
        haunchH: 0,
        skew: skew,
        uFlangeC: 0, //캔틸레버길이를 의미함
        uFlangeW: 0, //
        uFlangeThk: 0,
        lFlangeC: 0, //캘틸레버길이를 의미함
        lFlangeW: 0, //
        lFlangeThk: 0,
        lFlangeGradient: 0,
        webThk: 0,
        uRibH: 0,
        lConcThk: 0,
        uRibThk: 0,
        uRibLO: [],
        lRibH: 0,
        lRibThk: 0,
        lRibLO: [],
    };
    let backward = {
        height: 0,
        slabThickness: 0,
        haunchH: 0,
        skew: skew,
        uFlangeC: 0,
        uFlangeW: 0,
        uFlangeThk: 0,
        lFlangeC: 0, //캘틸레버길이를 의미함
        lFlangeW: 0, //
        lFlangeThk: 0,
        lFlangeGradient: 0,
        webThk: 0,
        lConcThk: 0,
        uRibH: 0,
        uRibThk: 0,
        uRibLO: [],
        lRibH: 0,
        lRibThk: 0,
        lRibLO: [],
    };

    let slabLayout = gridInput.slabLayout;
    let R = 0;
    let x1 = 0;
    let deltaH = 0;
    let L = 0;
    let height = 0;
    let heightb = 0;
    for (let i = 0; i < gridInput.range.H[girderIndex].length; i++) {
        let sName = i === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "H" + i.toFixed(0);
        let eName =
            i === gridInput.range.H[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "H" + (i + 1).toFixed(0);
        let sp = gridPointDict[sName];
        let ep = gridPointDict[eName];
        if (station >= sp.mainStation && station < ep.mainStation) {
            deltaH = gridInput.range.H[girderIndex][i][2] - gridInput.range.H[girderIndex][i][3];
            L = ep.mainStation - sp.mainStation;
            if (gridInput.range.H[girderIndex][i][4] == "circle") {
                if (deltaH > 0) {
                    R = Math.abs((L ** 2 + deltaH ** 2) / 2 / deltaH);
                    x1 = ep.mainStation - station;
                    height = gridInput.range.H[girderIndex][i][3] + (R - Math.sqrt(R ** 2 - x1 ** 2));
                    forward.lFlangeGradient = x1 / Math.sqrt(R ** 2 - x1 ** 2);
                } else if (deltaH < 0) {
                    R = Math.abs((L ** 2 + deltaH ** 2) / 2 / deltaH);
                    x1 = station - sp.mainStation;
                    height = gridInput.range.H[girderIndex][i][2] + (R - Math.sqrt(R ** 2 - x1 ** 2));
                    forward.lFlangeGradient = -x1 / Math.sqrt(R ** 2 - x1 ** 2);
                } else {
                    height = gridInput.range.H[girderIndex][i][2];
                    forward.lFlangeGradient = 0;
                }
            } else if (gridInput.range.H[girderIndex][i][4] == "parabola") {
                if (deltaH > 0) {
                    x1 = ep.mainStation - station;
                    height = gridInput.range.H[girderIndex][i][3] + (deltaH / L ** 2) * x1 ** 2;
                    forward.lFlangeGradient = (deltaH / L ** 2) * x1 * 2;
                } else if (deltaH < 0) {
                    x1 = station - sp.mainStation;
                    height = gridInput.range.H[girderIndex][i][2] - (deltaH / L ** 2) * x1 ** 2;
                    forward.lFlangeGradient = (deltaH / L ** 2) * x1 * 2;
                } else {
                    height = gridInput.range.H[girderIndex][i][2];
                    forward.lFlangeGradient = 0;
                }
            } else {
                //straight
                x1 = station - sp.mainStation;
                height = gridInput.range.H[girderIndex][i][2] - (x1 / L) * deltaH;
                forward.lFlangeGradient = deltaH / L;
            }
        }

        if (station > sp.mainStation && station <= ep.mainStation) {
            deltaH = gridInput.range.H[girderIndex][i][2] - gridInput.range.H[girderIndex][i][3];
            L = ep.mainStation - sp.mainStation;
            if (gridInput.range.H[girderIndex][i][4] == "circle") {
                if (deltaH > 0) {
                    R = Math.abs((L ** 2 + deltaH ** 2) / 2 / deltaH);
                    x1 = ep.mainStation - station;
                    heightb = gridInput.range.H[girderIndex][i][3] + (R - Math.sqrt(R ** 2 - x1 ** 2));
                    backward.lFlangeGradient = x1 / Math.sqrt(R ** 2 - x1 ** 2);
                } else if (deltaH < 0) {
                    R = Math.abs((L ** 2 + deltaH ** 2) / 2 / deltaH);
                    x1 = station - sp.mainStation;
                    heightb = gridInput.range.H[girderIndex][i][2] + (R - Math.sqrt(R ** 2 - x1 ** 2));
                    backward.lFlangeGradient = x1 / Math.sqrt(R ** 2 - x1 ** 2);
                } else {
                    heightb = gridInput.range.H[girderIndex][i][2];
                    backward.lFlangeGradient = 0;
                }
            } else if (gridInput.range.H[girderIndex][i][4] == "parabola") {
                if (deltaH > 0) {
                    x1 = ep.mainStation - station;
                    heightb = gridInput.range.H[girderIndex][i][3] + (deltaH / L ** 2) * x1 ** 2;
                    backward.lFlangeGradient = (deltaH / L ** 2) * x1 * 2;
                } else if (deltaH < 0) {
                    x1 = station - sp.mainStation;
                    heightb = gridInput.range.H[girderIndex][i][2] - (deltaH / L ** 2) * x1 ** 2;
                    backward.lFlangeGradient = (deltaH / L ** 2) * x1 * 2;
                } else {
                    heightb = gridInput.range.H[girderIndex][i][2];
                    backward.lFlangeGradient = 0;
                }
            } else {
                //straight
                x1 = station - sp.mainStation;
                heightb = gridInput.range.H[girderIndex][i][2] - (x1 / L) * deltaH;
                backward.lFlangeGradient = deltaH / L;
            }
        }
    }
    forward.height = height; //
    backward.height = heightb === 0 ? height : heightb; //형고가 불연속인 경우, 단부절취의 경우 수정이 필요함
    // position:0, T:1, H:2
    let slabThickness = 0;
    for (let i = 0; i < slabLayout.length - 1; i++) {
        let ss = gridPointDict["G" + (girderIndex + 1).toFixed(0) + slabLayout[i][0].substr(2)].mainStation;
        let es = gridPointDict["G" + (girderIndex + 1).toFixed(0) + slabLayout[i + 1][0].substr(2)].mainStation;
        if (station >= ss && station <= es) {
            let x = station - ss;
            let l = es - ss;
            slabThickness = (slabLayout[i][1] * (l - x)) / l + (slabLayout[i + 1][1] * x) / l;
            forward.haunchH = (slabLayout[i][5] * (l - x)) / l + (slabLayout[i + 1][5] * x) / l;
            backward.haunchH = (slabLayout[i][5] * (l - x)) / l + (slabLayout[i + 1][5] * x) / l;
        }
        // if (station > ss && station <= es) {
        //     backward.haunchH = slabLayout[i][5] * (l - x) / l + slabLayout[i + 1][5] * (x) / l
        // }
    }
    if (station <= gridPointDict["G" + (girderIndex + 1).toFixed(0) + slabLayout[0][0].substr(2)].mainStation) {
        slabThickness = slabLayout[0][1];
        forward.haunchH = slabLayout[0][5];
        backward.haunchH = slabLayout[0][5];
    } else if (station >= gridPointDict["G" + (girderIndex + 1).toFixed(0) + slabLayout[slabLayout.length - 1][0].substr(2)].mainStation) {
        slabThickness = slabLayout[slabLayout.length - 1][1];
        forward.haunchH = slabLayout[slabLayout.length - 1][5];
        backward.haunchH = slabLayout[slabLayout.length - 1][5];
    }

    forward.slabThickness = slabThickness;
    backward.slabThickness = slabThickness;
    let sName = "";
    let eName = "";

    for (let index = 0; index < gridInput.range.TW[girderIndex].length; index++) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TW" + index;
        eName =
            index === gridInput.range.TW[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "TW" + (index + 1);
        if (station >= gridPointDict[sName].mainStation && station < gridPointDict[eName].mainStation) {
            let uFlange = gridInput.range.TW[girderIndex][index];
            forward.uFlangeW =
                uFlange[2] +
                ((uFlange[3] - uFlange[2]) * (station - gridPointDict[sName].mainStation)) /
                    (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
            forward.uFlangeC =
                uFlange[4] +
                ((uFlange[5] - uFlange[4]) * (station - gridPointDict[sName].mainStation)) /
                    (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
            break;
        }
    }
    for (let index = 0; index < gridInput.range.TW[girderIndex].length; index++) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TW" + index;
        eName =
            index === gridInput.range.TW[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "TW" + (index + 1);
        if (station > gridPointDict[sName].mainStation && station <= gridPointDict[eName].mainStation) {
            let uFlange = gridInput.range.TW[girderIndex][index];
            backward.uFlangeW =
                uFlange[2] +
                ((uFlange[3] - uFlange[2]) * (station - gridPointDict[sName].mainStation)) /
                    (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
            backward.uFlangeC =
                uFlange[4] +
                ((uFlange[5] - uFlange[4]) * (station - gridPointDict[sName].mainStation)) /
                    (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
            break;
        }
    }
    var uFlangeT = gridInput.range.TF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TF" + index;
        eName =
            index === gridInput.range.TF[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "TF" + (index + 1);
        return station >= gridPointDict[sName].mainStation && station < gridPointDict[eName].mainStation;
    });
    if (uFlangeT.length > 0) {
        forward.uFlangeThk = uFlangeT[0][2];
    }
    uFlangeT = gridInput.range.TF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TF" + index;
        eName =
            index === gridInput.range.TF[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "TF" + (index + 1);
        return station > gridPointDict[sName].mainStation && station <= gridPointDict[eName].mainStation;
    });
    if (uFlangeT.length > 0) {
        backward.uFlangeThk = uFlangeT[0][2];
    }
    for (let index = 0; index < gridInput.range.BW[girderIndex].length; index++) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BW" + index;
        eName =
            index === gridInput.range.BW[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "BW" + (index + 1);
        if (station >= gridPointDict[sName].mainStation && station < gridPointDict[eName].mainStation) {
            let lFlange = gridInput.range.BW[girderIndex][index];
            forward.lFlangeW =
                lFlange[2] +
                ((lFlange[3] - lFlange[2]) * (station - gridPointDict[sName].mainStation)) /
                    (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
            forward.lFlangeC =
                lFlange[4] +
                ((lFlange[5] - lFlange[4]) * (station - gridPointDict[sName].mainStation)) /
                    (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
            break;
        }
    }
    for (let index = 0; index < gridInput.range.BW[girderIndex].length; index++) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BW" + index;
        eName =
            index === gridInput.range.BW[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "BW" + (index + 1);
        if (station > gridPointDict[sName].mainStation && station <= gridPointDict[eName].mainStation) {
            let lFlange = gridInput.range.BW[girderIndex][index];
            backward.lFlangeW =
                lFlange[2] +
                ((lFlange[3] - lFlange[2]) * (station - gridPointDict[sName].mainStation)) /
                    (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
            backward.lFlangeC =
                lFlange[4] +
                ((lFlange[5] - lFlange[4]) * (station - gridPointDict[sName].mainStation)) /
                    (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
            break;
        }
    }
    var lFlangeT = gridInput.range.BF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BF" + index;
        eName =
            index === gridInput.range.BF[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "BF" + (index + 1);
        return station >= gridPointDict[sName].mainStation && station < gridPointDict[eName].mainStation;
    });
    if (lFlangeT.length > 0) {
        forward.lFlangeThk = lFlangeT[0][2];
    }
    lFlangeT = gridInput.range.BF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BF" + index;
        eName =
            index === gridInput.range.BF[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "BF" + (index + 1);
        return station > gridPointDict[sName].mainStation && station <= gridPointDict[eName].mainStation;
    });
    if (lFlangeT.length > 0) {
        backward.lFlangeThk = lFlangeT[0][2];
    }

    var web = gridInput.range.WF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "WF" + index;
        eName =
            index === gridInput.range.WF[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "WF" + (index + 1);
        return station >= gridPointDict[sName].mainStation && station < gridPointDict[eName].mainStation;
    });
    if (web.length > 0) {
        forward.webThk = web[0][2];
    }
    web = gridInput.range.WF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "WF" + index;
        eName =
            index === gridInput.range.WF[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "WF" + (index + 1);
        return station > gridPointDict[sName].mainStation && station <= gridPointDict[eName].mainStation;
    });
    if (web.length > 0) {
        backward.webThk = web[0][2];
    }

    try {
        for (let index = 0; index < gridInput.range.LC[girderIndex].length; index++) {
            // sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "LC" + (index);
            // eName = index === gridInput.range.LC[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "LC" + (index + 1);
            sName = gridInput.range.LC[girderIndex][index][0];
            eName = gridInput.range.LC[girderIndex][index][1];

            if (station >= gridPointDict[sName].mainStation && station < gridPointDict[eName].mainStation) {
                let lConc = gridInput.range.LC[girderIndex][index];
                forward.lConcThk =
                    lConc[2] +
                    ((lConc[3] - lConc[2]) * (station - gridPointDict[sName].mainStation)) /
                        (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
                break;
            }
        }

        for (let index = 0; index < gridInput.range.LC[girderIndex].length; index++) {
            // sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "LC" + (index);
            // eName = index === gridInput.range.LC[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "LC" + (index + 1);
            sName = gridInput.range.LC[girderIndex][index][0];
            eName = gridInput.range.LC[girderIndex][index][1];
            if (station > gridPointDict[sName].mainStation && station <= gridPointDict[eName].mainStation) {
                let lConc = gridInput.range.LC[girderIndex][index];
                backward.lConcThk =
                    lConc[2] +
                    ((lConc[3] - lConc[2]) * (station - gridPointDict[sName].mainStation)) /
                        (gridPointDict[eName].mainStation - gridPointDict[sName].mainStation);
                break;
            }
        }
    } catch (e) {
        // console.log(station, gridPointDict, sName, eName);
    }
    var uRib = gridInput.range.TR[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TR" + index;
        eName =
            index === gridInput.range.TR[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "TR" + (index + 1);
        return station >= gridPointDict[sName].mainStation && station < gridPointDict[eName].mainStation;
    });
    if (uRib.length > 0) {
        if (uRib[0][2] * uRib[0][3] > 0) {
            forward.uRibThk = uRib[0][2];
            forward.uRibH = uRib[0][3];
            let layout = uRib[0][4] === "" ? [] : isNaN(uRib[0][4]) ? uRib[0][4].split(",") : [uRib[0][4]];
            layout.forEach(elem => forward.uRibLO.push(elem * 1));
        }
    }
    uRib = gridInput.range.TR[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TR" + index;
        eName =
            index === gridInput.range.TR[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "TR" + (index + 1);
        return station > gridPointDict[sName].mainStation && station <= gridPointDict[eName].mainStation;
    });
    if (uRib.length > 0) {
        if (uRib[0][2] * uRib[0][3] > 0) {
            backward.uRibThk = uRib[0][2];
            backward.uRibH = uRib[0][3];
            let layout = uRib[0][4] === "" ? [] : isNaN(uRib[0][4]) ? uRib[0][4].split(",") : [uRib[0][4]];
            layout.forEach(elem => backward.uRibLO.push(elem * 1));
        }
    }

    var lRib = gridInput.range.BR[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BR" + index;
        eName =
            index === gridInput.range.BR[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "BR" + (index + 1);
        return station >= gridPointDict[sName].mainStation && station < gridPointDict[eName].mainStation;
    });
    if (lRib.length > 0) {
        if (lRib[0][2] * lRib[0][3] > 0) {
            forward.lRibThk = lRib[0][2];
            forward.lRibH = lRib[0][3];
            let layout = lRib[0][4] === "" ? [] : isNaN(lRib[0][4]) ? lRib[0][4].split(",") : [lRib[0][4]];
            layout.forEach(elem => forward.lRibLO.push(+elem));
        }
    }
    lRib = gridInput.range.BR[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BR" + index;
        eName =
            index === gridInput.range.BR[girderIndex].length - 1
                ? "G" + (girderIndex + 1).toFixed(0) + "K7"
                : "G" + (girderIndex + 1).toFixed(0) + "BR" + (index + 1);
        return station > gridPointDict[sName].mainStation && station <= gridPointDict[eName].mainStation;
    });
    if (lRib.length > 0) {
        if (lRib[0][2] * lRib[0][3] > 0) {
            backward.lRibThk = lRib[0][2];
            backward.lRibH = lRib[0][3];
            let layout = lRib[0][4] === "" ? [] : isNaN(lRib[0][4]) ? lRib[0][4].split(",") : [lRib[0][4]];
            layout.forEach(elem => backward.lRibLO.push(+elem));
        }
    }

    return { forward, backward };
}

export function scallop(point1, point2, point3, radius, smoothness) {
    let points = [];
    let v1 = new THREE.Vector2(point1.x - point2.x, point1.y - point2.y).normalize();
    let v2 = new THREE.Vector2(point3.x - point2.x, point3.y - point2.y).normalize();
    for (let i = 0; i < smoothness + 1; i++) {
        let v3 = new THREE.Vector2().addVectors(v1.clone().multiplyScalar(smoothness - i), v2.clone().multiplyScalar(i)).setLength(radius);
        points.push({ x: v3.x + point2.x, y: v3.y + point2.y });
    }
    return points;
}

export function GetSectionDimensionDict(sectionPoint) {
    let top = [];
    let bottom = [];
    let left = [];
    let right = [];
    let topIndex = true; //가장 상위의 index가 왼쪽일 경우 true 오른쪽인 경우 false
    let bottomIndex = true;
    if (sectionPoint.uflange[2].length > 0) {
        top.push(sectionPoint.uflange[2][0], sectionPoint.uflange[2][1]);
    } else {
        top.push(sectionPoint.uflange[0][0], sectionPoint.uflange[0][1], sectionPoint.uflange[1][0], sectionPoint.uflange[1][1]);
    }
    for (let i in sectionPoint.URib) {
        top.push(GetWeldingPoint([sectionPoint.URib[i][0], sectionPoint.URib[i][3]], 0.5));
    }
    if (sectionPoint.lflange[2].length > 0) {
        bottom.push(sectionPoint.lflange[2][0], sectionPoint.lflange[2][1]);
    } else {
        bottom.push(sectionPoint.lflange[0][0], sectionPoint.lflange[0][1], sectionPoint.lflange[1][0], sectionPoint.lflange[1][1]);
    }
    for (let i in sectionPoint.LRib) {
        bottom.push(GetWeldingPoint([sectionPoint.LRib[i][0], sectionPoint.LRib[i][3]], 0.5));
    }
    top.push(sectionPoint.web[0][1], sectionPoint.web[1][1]);
    bottom.push(sectionPoint.web[0][0], sectionPoint.web[1][0]);
    top.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    bottom.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });

    left.push(sectionPoint.web[0][0], sectionPoint.web[0][1]);
    right.push(sectionPoint.web[1][0], sectionPoint.web[1][1]);

    topIndex = top[0].y < top[top.length - 1].y ? false : true;
    bottomIndex = bottom[0].y < bottom[bottom.length - 1].y ? true : false;
    return { top, bottom, left, right, topIndex, bottomIndex };
}

export function SectionPointToSectionView(sectionPoint) {
    let draw = [];
    for (var key in sectionPoint) {
        if (key === "uflange" || key === "lflange" || key === "web" || key === "URib" || key === "LRib") {
            for (let k in sectionPoint[key]) {
                if (sectionPoint[key][k].length > 0) {
                    let meta = {};
                    draw.push(new Line(sectionPoint[key][k], "CYAN", true, null, meta));
                }
            }
        }
    }
    if (sectionPoint["lConc"].length > 0) {
        let meta = {};
        draw.push(new Hatch(sectionPoint["lConc"], "GRAY2", meta));
    }
    return draw;
}

export function ApplyXGradient(point, stPoint) {
    let gradient = stPoint.gradientX ?? 0;
    if (Array.isArray(point)) {
        let result = [];
        point.forEach(pt => {
            let newPt = { ...pt };
            newPt.z = newPt.z + newPt.z * gradient;
            result.push(pt);
        });
        return result;
    } else {
        let newPt = { ...pt };
        newPt.z = newPt.z + newPt.z * gradient;
        return newPt;
    }
    return newPt;
}

// TODO:내용 파악 후 삭제하고 해당 함수에 대응되는 RefPoint를 생성하기 위한 함수를 작성해야함.
export function ToGlobalPoint2(Point, node2D) {
    let newPoint = {
        x: 0,
        y: 0,
        z: 0,
    };
    let skew = Point.skew ? Point.skew : 90;
    const cos = Point.normalCos;
    const sin = Point.normalSin;
    // let skewCot = 0;
    // if (Point.skew !=90){
    //     skewCot = - 1 / Math.tan(Point.skew * Math.PI/180)
    // };
    let X = node2D.x;
    let Y = node2D.y;
    let Z = Point.gradientX ? Point.gradientX * node2D.y : 0;

    newPoint.x = Point.x + X * cos - Y * sin;
    newPoint.y = Point.y + X * sin + Y * cos;
    newPoint.z = Point.z + Z;
    newPoint.s = Point.mainStation;
    newPoint.skew = skew;
    newPoint.normalCos = cos;
    newPoint.normalSin = sin;
    newPoint.girderStation = Point.girderStation + Y;

    return newPoint;
}
