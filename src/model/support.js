import { Loft } from "@nexivil/package-modules";

export function GenSupportModelFn(gridPointDict, sectionPointDict, supportLayout, supportFixed) {
    let data = {};
    let model = { parent: [], children: [] };
    let girderHeight = 2000; //임시로 2000이라고 가정함. 추후 girderSection정보로부터 받아올수 있도록 함.
    let fixedPoint = [];
    let isFixed = false;
    let angle = 0;
    let sign = 1;
    let type = "";
    let name = "";
    let point = {};
    let width = 0;
    let height = 0;
    let thickness = 0;

    const dof = {
        고정단: [true, true, true, false, false, false],
        양방향단: [false, false, true, false, false, false],
        횡방향가동: [true, false, true, false, false, false],
        종방향가동: [false, true, true, false, false, false],
    };
    let fixedCoord = { x: 0, y: 0, z: 0 };
    // 고정단기준이 체크되지 않거나, 고정단이 없을 경우에는 접선방향으로 받침을 계산함
    if (supportFixed) {
        fixedPoint = supportLayout.filter(function (value) {
            return value[1] == "고정단";
        });
    }

    if (fixedPoint.length > 0) {
        isFixed = true;
        let fixed = gridPointDict[fixedPoint[0][0]];
        girderHeight = -sectionPointDict[fixedPoint[0][0]].forward.lflangeSide[1];
        let skew = (fixed.skew * Math.PI) / 180;
        let offset = fixedPoint[0][2];
        fixedCoord = {
            x: fixed.x - (Math.cos(skew) * -1 * fixed.normalSin - Math.sin(skew) * fixed.normalCos) * offset,
            y: fixed.y - (Math.sin(skew) * -1 * fixed.normalSin + Math.cos(skew) * fixed.normalCos) * offset,
            z: fixed.z - girderHeight,
        };
    }

    for (let index in supportLayout) {
        let name0 = supportLayout[index][0]; //.point
        name = name0.includes("L") || name0.includes("R") ? name0.slice(0, -1) : name0;
        type = supportLayout[index][1]; //.type
        width = supportLayout[index][3];
        height = supportLayout[index][4];
        thickness = supportLayout[index][5];

        let offset = 0;
        supportLayout[index][2]; //.offset
        point = gridPointDict[name];
        if (name0.includes("L")) {
            let p1 = sectionPointDict[name].forward.lflange[0][2];
            let p2 = sectionPointDict[name].forward.lflange[0][3];
            offset = supportLayout[index][2] + (p1.x + p2.x) / 2;
            girderHeight = -(p1.y + p2.y) / 2;
        } else if (name0.includes("R")) {
            let p1 = sectionPointDict[name].forward.lflange[1][2];
            let p2 = sectionPointDict[name].forward.lflange[1][3];
            offset = supportLayout[index][2] + (p1.x + p2.x) / 2;
            girderHeight = -(p1.y + p2.y) / 2;
        } else {
            offset = supportLayout[index][2];
            girderHeight = -sectionPointDict[name].forward.lflangeSide[1];
        }

        let skew = (point.skew * Math.PI) / 180;
        let newPoint = {
            x: point.x - (Math.cos(skew) * -1 * point.normalSin - Math.sin(skew) * point.normalCos) * offset,
            y: point.y - (Math.sin(skew) * -1 * point.normalSin + Math.cos(skew) * point.normalCos) * offset,
            z: point.z - girderHeight,
            offset: point.offset + offset,
        };
        if (isFixed && name !== fixedPoint[0][0]) {
            if (name.slice(2) === fixedPoint[0][0].slice(2)) {
                angle = Math.atan2(newPoint.y - fixedCoord.y, newPoint.x - fixedCoord.x) + Math.PI / 2;
            } else {
                angle = Math.atan2(newPoint.y - fixedCoord.y, newPoint.x - fixedCoord.x);
            }
        } else {
            sign = point.normalCos >= 0 ? 1 : -1;
            angle = sign * Math.acos(-point.normalSin);
        }
        data[index] = {
            angle: angle > Math.PI / 2 ? angle - Math.PI : angle < -Math.PI / 2 ? angle + Math.PI : angle,
            point: newPoint,
            basePointName: name0,
            key: "SPPT" + index,
            type: dof[type], //[x,y,z,rx,ry,rz]
            solePlateThck: thickness,
        };

        let pointAng = Math.atan2(point.normalCos, -point.normalSin) - Math.PI / 2;
        let dA = data[index].angle - pointAng;
        let cos = Math.cos(dA);
        let sin = Math.sin(dA);
        let tan = point.gradientX;
        let points1 = [
            { x: (-cos * width) / 2 - (sin * height) / 2, y: (-sin * width) / 2 + (cos * height) / 2, z: -thickness },
            { x: (-cos * width) / 2 + (sin * height) / 2, y: (-sin * width) / 2 - (cos * height) / 2, z: -thickness },
            { x: (cos * width) / 2 + (sin * height) / 2, y: (sin * width) / 2 - (cos * height) / 2, z: -thickness },
            { x: (cos * width) / 2 - (sin * height) / 2, y: (sin * width) / 2 + (cos * height) / 2, z: -thickness },
        ];
        let points2 = [];
        points1.forEach(point => points2.push({ x: point.x, y: point.y, z: point.z + thickness + point.x * tan }));
        let newPoints = [[], []];
        let nCos = Math.cos(pointAng);
        let nSin = Math.sin(pointAng);
        points1.forEach(pt1 =>
            newPoints[1].push({
                x: newPoint.x + pt1.x * nCos - pt1.y * nSin,
                y: newPoint.y + pt1.x * nSin + pt1.y * nCos,
                z: newPoint.z + pt1.z,
            })
        );
        points2.forEach(pt2 =>
            newPoints[0].push({
                x: newPoint.x + pt2.x * nCos - pt2.y * nSin,
                y: newPoint.y + pt2.x * nSin + pt2.y * nCos,
                z: newPoint.z + pt2.z,
            })
        );

        let part = new Loft(newPoints, true, "Support", { key: "SPPT" + index, part: name });
        model["children"].push(part);
        // model["children"].push({
        //     type: "loft",
        //     points: newPoints,
        //     meta: { key: "SPPT" + index, part: name },
        //     get threeFunc() {
        //         return InitPoint => LoftModelView(this.points, this.closed, this.cap, this.ptGroup, InitPoint);
        //     },
        // });
    }
    return { model, data };
}
