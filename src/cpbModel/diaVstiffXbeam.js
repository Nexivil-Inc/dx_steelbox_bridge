import { Extrude, GetArcPoints, GetArcPoints2D, GetFilletPoints2D, PlateRestPoint, Point, PointToGlobal, PointToSkewedGlobal, RefPoint, StPoint } from "@nexivil/package-modules";
import { scallop, toRefPoint } from "@nexivil/package-modules/src/temp";
import { THREE } from "global";
import { Bolt } from "./3D";

export function vPlateGenV2(points, centerPoint, scallopVertex, scallopR, urib, lrib) {
    let skew = centerPoint.skew;

    const bl = points[0];
    const br = points[1];
    const tl = points[3];
    const tr = points[2];

    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    const gradient2 = (br.y - bl.y) / (br.x - bl.x);
    const cosec = 1 / Math.cos(skew);

    let mainPlate = [];
    points.forEach(pt => mainPlate.push({ x: pt.x * cosec, y: pt.y }));

    let upperPoints = [];
    if (urib) {
        for (let i = 0; i < urib.layout.length; i++) {
            upperPoints.push({ x: urib.layout[i] * cosec - urib.ribHoleD, y: tl.y + gradient * (urib.layout[i] - urib.ribHoleD - tl.x) });
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
            upperPoints.push({ x: urib.layout[i] * cosec + urib.ribHoleD, y: tl.y + gradient * (urib.layout[i] + urib.ribHoleD - tl.x) });
        }
    }
    let lowerPoints = [];
    if (lrib) {
        if (lrib.type == 0) {
            for (let i = 0; i < lrib.layout.length; i++) {
                lowerPoints.push({ x: lrib.layout[i] * cosec - lrib.ribHoleD, y: bl.y + gradient2 * (lrib.layout[i] - lrib.ribHoleD - bl.x) });
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
                lowerPoints.push({ x: lrib.layout[i] * cosec + lrib.ribHoleD, y: bl.y + gradient2 * (lrib.layout[i] + lrib.ribHoleD - bl.x) });
            }
        } else if (lrib.type === 1) {
            for (let i = 0; i < lrib.layout.length; i++) {
                let dummyPoints = [];
                dummyPoints.push(
                    { x: lrib.layout[i] * cosec - lrib.thickness / 2 - 1, y: bl.y + gradient2 * (lrib.layout[i] - lrib.thickness / 2 - 1 - bl.x) },
                    { x: lrib.layout[i] * cosec - lrib.thickness / 2 - 1, y: bl.y + gradient2 * (lrib.layout[i] - bl.x) + lrib.height + 1 },
                    { x: lrib.layout[i] * cosec + lrib.thickness / 2 + 1, y: bl.y + gradient2 * (lrib.layout[i] - bl.x) + lrib.height + 1 },
                    { x: lrib.layout[i] * cosec + lrib.thickness / 2 + 1, y: bl.y + gradient2 * (lrib.layout[i] + lrib.thickness / 2 + 1 - bl.x) }
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
    return resultPoints;
}

export function DiaShapeDictV2(stPointDict, sectionPointDict, diaphragmLayout, diaphragmSectionList, sectionDB) {
    // const position = 0;
    const section = 2;
    let result = { parent: [], children: [] };
    let xbeamData = [];
    // let idSet = new Set

    for (let i = 0; i < diaphragmLayout.length; i++) {
        for (let j = 0; j < diaphragmLayout[i].length; j++) {
            // let xbData;
            // let xbSection;
            let gridkey = "G" + (i + 1).toFixed(0) + "D" + (j + 1).toFixed(0); // iaphragmLayout[i][position];
            let diaSectionName = diaphragmLayout[i][j][section];
            let diaSection = diaphragmSectionList[diaSectionName];
            let xbData;
            let xbSection;
            if (diaFnV2[diaSectionName]) {
                let sectionPoint = sectionPointDict[gridkey].forward;
                let dia = diaFnV2[diaSectionName](sectionPoint, stPointDict[gridkey], diaSection, gridkey, diaSectionName, sectionDB);
                result["children"].push(...dia.children);
                result["parent"].push(...dia.parent);
                // xbData = dia["parent"][0].data;
                // xbSection = dia["parent"][0].section;
                // if (xbData && xbSection) {
                //     xbeamData.push({
                //         inode: gridkey + "L",
                //         jnode: gridkey + "R",
                //         key: gridkey + "X",
                //         isKframe: false,
                //         data: xbData,
                //         section: xbSection,
                //     });
                // }
            }
        }
    }
    return { diaDict: result, xbeamData };
}

const diaFnV2 = {
    "플레이트-하": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
        return DYdia0V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    },
    "플레이트-중": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
        return DYdia1V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    },
    "박스부-중앙홀": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
        return DYdia5V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    },
    "박스부-지점": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
        return DYdia6V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    },
    "박스부-지점2": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
        return DYdia6V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    },
};

export function DYdia6V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    // let diaSection = {
    //     "webThickness": 12,
    //     "hstiffWidth": 270,
    //     "hstiffWidth2": 200,
    //     "hstiffThickness": 12,
    //     "hstiffHeight": 610,
    //     "scallopRadius": 35,
    //     "ribHoleD": 42,
    //     "ribHoleR": 25,
    //     "holeBottomY": 550,
    //     "holeCenterOffset": -679,
    //     "holeWidth": 450,
    //     "holeHeight": 700,
    //     "holeFilletR": 100,
    //     "holeStiffThickness": 10,
    //     "holeStiffhl": 610,
    //     "holeStiffvl": 860,
    //     "holeStiffmargin": 20,
    //     "holeStiffHeight": 100,
    //     "supportStiffLayout": [-200, 0, 200],
    //     "supportStiffWidth": 265,
    //     "supportStiffThickness": 26
    // } //  임시 입력변수
    let sectionID =
        sectionPoint.input.wuf.toFixed(0) +
        sectionPoint.input.wlf.toFixed(0) +
        sectionPoint.input.tlf.toFixed(0) +
        sectionPoint.input.tuf.toFixed(0) +
        sectionPoint.input.tw.toFixed(0);

    let urib = sectionPoint.input.Urib;
    let lrib = sectionPoint.input.Lrib;
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    let diaHeight = tl.y - gradient * tr.x - bl.y;
    let urib2 = urib;
    urib2.ribHoleD = diaSection.ribHoleD;
    urib2.ribHoleR = diaSection.ribHoleR;
    let lrib2 = lrib;
    lrib2.ribHoleD = diaSection.ribHoleD;
    lrib2.ribHoleR = diaSection.ribHoleR;
    lrib.type = 1; //하부리브 스캘럽

    let sec = 1 / Math.cos(point.skew);
    let result = {
        parent: [],
        children: [],
    };
    const group = "Girder" + String(point.girderNum);
    let holeRect = [
        { x: sec * (diaSection.holeWidth / 2 + diaSection.holeCenterOffset), y: bl.y + diaSection.holeBottomY },
        { x: sec * (-diaSection.holeWidth / 2 + diaSection.holeCenterOffset), y: bl.y + diaSection.holeBottomY },
        { x: sec * (-diaSection.holeWidth / 2 + diaSection.holeCenterOffset), y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
        { x: sec * (diaSection.holeWidth / 2 + diaSection.holeCenterOffset), y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
    ];
    let holePoints = [];
    holePoints.push(...GetArcPoints(holeRect[0], holeRect[1], holeRect[2], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[1], holeRect[2], holeRect[3], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[2], holeRect[3], holeRect[0], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[3], holeRect[0], holeRect[1], diaSection.holeFilletR, 4));
    let mainPlatePts = vPlateGenV2([bl, br, tr, tl], point, [0, 1, 2, 3], diaSection.scallopRadius, urib2, lrib2);

    let ref = toRefPoint(point, true); //skewed vertical plane
    result["children"].push(
        new Extrude(mainPlatePts, diaSection.webThickness, { refPoint: ref, holes: [holePoints] }, "steelBox", {
            group: group,
            part: gridkey,
            key: "mainPlate",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );

    let holeCenter1 = {
        x: diaSection.holeCenterOffset,
        y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
    };
    let hstiff1 = [
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
    ];
    result["children"].push(
        new Extrude(
            hstiff1,
            diaSection.holeStiffThickness,
            { refPoint: new RefPoint(PointToSkewedGlobal(holeCenter1, point), ref.xAxis, 0) },
            "steelBox",
            { group: group, part: gridkey, key: "hStiff1", girder: point.girderNum, seg: point.segNum }
        )
    );

    let holeCenter2 = { x: diaSection.holeCenterOffset, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin };

    result["children"].push(
        new Extrude(
            hstiff1,
            diaSection.holeStiffThickness,
            { refPoint: new RefPoint(PointToSkewedGlobal(holeCenter2, point), ref.xAxis, 0) },
            "steelBox",
            { group: group, part: gridkey, key: "hStiff2", girder: point.girderNum, seg: point.segNum }
        )
    );

    let vstiff1 = [
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
    ];
    let holeCenter3 = {
        x: diaSection.holeCenterOffset - diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };
    let holeCenter4 = {
        x: diaSection.holeCenterOffset + diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };

    let cp3 = new RefPoint(PointToSkewedGlobal(holeCenter3, point), ref.xAxis, 0);
    let cp4 = new RefPoint(PointToSkewedGlobal(holeCenter4, point), ref.xAxis, 0);
    result["children"].push(
        new Extrude(vstiff1, diaSection.holeStiffThickness, { refPoint: { ...cp3, yRotation: Math.PI / 2 } }, "steelBox", {
            group: group,
            part: gridkey,
            key: "vStiff1",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    result["children"].push(
        new Extrude(vstiff1, diaSection.holeStiffThickness, { refPoint: { ...cp4, yRotation: Math.PI / 2 } }, "steelBox", {
            group: group,
            part: gridkey,
            key: "vStiff2",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );

    let supportStiffLayout = [];
    if (isNaN(diaSection.supportStiffLayout)) {
        diaSection.supportStiffLayout.split(",").forEach(el => supportStiffLayout.push(el * 1));
    } else {
        supportStiffLayout.push(diaSection.supportStiffLayout);
    }

    for (let i in supportStiffLayout) {
        let supportStiffCenter1 = { x: supportStiffLayout[i], y: tl.y + gradient * (supportStiffLayout[i] - tl.x) };
        let supportStiff1 = [
            { x: 0, y: diaSection.webThickness / 2 },
            { x: supportStiffCenter1.y - bl.y, y: diaSection.webThickness / 2 },
            { x: supportStiffCenter1.y - bl.y, y: diaSection.supportStiffWidth + diaSection.webThickness / 2 },
            { x: 0, y: diaSection.supportStiffWidth + diaSection.webThickness / 2 },
        ];
        let supportStiff2 = [
            { x: 0, y: -diaSection.webThickness / 2 },
            { x: supportStiffCenter1.y - bl.y, y: -diaSection.webThickness / 2 },
            { x: supportStiffCenter1.y - bl.y, y: -diaSection.supportStiffWidth - diaSection.webThickness / 2 },
            { x: 0, y: -diaSection.supportStiffWidth - diaSection.webThickness / 2 },
        ];
        let cp = new RefPoint(PointToSkewedGlobal(supportStiffCenter1, point), point.xAxis, 0);
        result["children"].push(
            new Extrude(supportStiff1, diaSection.supportStiffThickness, { refPoint: { ...cp, yRotation: Math.PI / 2 } }, "steelBox", {
                group: group,
                part: gridkey,
                key: "supportStiff1" + i,
                girder: point.girderNum,
                seg: point.segNum,
            })
        );

        result["children"].push(
            new Extrude(supportStiff2, diaSection.supportStiffThickness, { refPoint: { ...cp, yRotation: Math.PI / 2 } }, "steelBox", {
                group: group,
                part: gridkey,
                key: "supportStiff2" + i,
                girder: point.girderNum,
                seg: point.segNum,
            })
        );
    }
    let hStiffCenter = { x: 0, y: bl.y + diaSection.hstiffHeight };
    let ref1 = new RefPoint(PointToSkewedGlobal(hStiffCenter, point), point.xAxis, 0);
    let tan = Math.tan(point.skew);
    let sign = diaSection.holeCenterOffset < 0 ? 1 : -1;
    const holeWidth = sign * diaSection.holeWidth;
    let w0 = diaSection.webThickness / 2;
    let w1 = diaSection.holeStiffHeight + diaSection.webThickness / 2;
    let w2 = diaSection.hstiffWidth + diaSection.webThickness / 2;
    let w3 = diaSection.hstiffWidth2 + diaSection.webThickness / 2;
    let hx = [
        [bl.x + lwCot * diaSection.hstiffHeight, w2],
        [br.x + rwCot * diaSection.hstiffHeight, w2],
    ];
    if (
        diaSection.hstiffHeight < diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2 &&
        diaSection.hstiffHeight > diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2
    ) {
        let dx = ((diaSection.hstiffHeight - diaSection.holeBottomY) / diaSection.holeHeight) * 100;
        hx.push(
            [diaSection.holeCenterOffset - holeWidth / 2 - sign * (diaSection.holeStiffmargin + diaSection.holeStiffThickness + dx), w1],
            [diaSection.holeCenterOffset + holeWidth / 2 + sign * (diaSection.holeStiffmargin + diaSection.holeStiffThickness), w1]
        );
    }
    for (let i in supportStiffLayout) {
        hx.push([supportStiffLayout[i] - diaSection.supportStiffThickness / 2, w3]);
        hx.push([supportStiffLayout[i] + diaSection.supportStiffThickness / 2, w3]);
    }
    hx.sort(function (a, b) {
        return a[0] > b[0] ? 1 : -1;
    });
    let h2 = [];
    let h3 = [];
    for (let i = 0; i < hx.length / 2; i++) {
        h2.push([
            { x: hx[i * 2][0], y: -(hx[i * 2][1] - 10) + tan * hx[i * 2][0] },
            { x: hx[i * 2][0] + 10, y: -hx[i * 2][1] + tan * (hx[i * 2][0] + 10) },
            { x: hx[i * 2 + 1][0] - 10, y: -hx[i * 2 + 1][1] + tan * (hx[i * 2 + 1][0] - 10) },
            { x: hx[i * 2 + 1][0], y: -(hx[i * 2 + 1][1] - 10) + tan * hx[i * 2 + 1][0] },
            { x: hx[i * 2 + 1][0], y: -(w0 + 10) + tan * hx[i * 2 + 1][0] },
            { x: hx[i * 2 + 1][0] - 10, y: -w0 + tan * (hx[i * 2 + 1][0] - 10) },
            { x: hx[i * 2][0] + 10, y: -w0 + tan * (hx[i * 2][0] + 10) },
            { x: hx[i * 2][0], y: -(w0 + 10) + tan * hx[i * 2][0] },
        ]);
        h3.push([
            { x: hx[i * 2][0], y: hx[i * 2][1] - 10 + tan * hx[i * 2][0] },
            { x: hx[i * 2][0] + 10, y: hx[i * 2][1] + tan * (hx[i * 2][0] + 10) },
            { x: hx[i * 2 + 1][0] - 10, y: hx[i * 2 + 1][1] + tan * (hx[i * 2 + 1][0] - 10) },
            { x: hx[i * 2 + 1][0], y: hx[i * 2 + 1][1] - 10 + tan * hx[i * 2 + 1][0] },
            { x: hx[i * 2 + 1][0], y: w0 + 10 + tan * hx[i * 2 + 1][0] },
            { x: hx[i * 2 + 1][0] - 10, y: w0 + tan * (hx[i * 2 + 1][0] - 10) },
            { x: hx[i * 2][0] + 10, y: w0 + tan * (hx[i * 2][0] + 10) },
            { x: hx[i * 2][0], y: w0 + 10 + tan * hx[i * 2][0] },
        ]);
    }
    for (let i = 0; i < hx.length / 2; i++) {
        result["children"].push(
            new Extrude(h2[i], diaSection.hstiffThickness, { refPoint: ref1 }, "steelBox", {
                group: group,
                part: gridkey,
                key: "h2" + i,
                girder: point.girderNum,
                seg: point.segNum,
            })
        );
        result["children"].push(
            new Extrude(h3[i], diaSection.hstiffThickness, { refPoint: ref1 }, "steelBox", {
                group: group,
                part: gridkey,
                key: "h3" + i,
                girder: point.girderNum,
                seg: point.segNum,
            })
        );
    }
    return result;
}

export function DYdia5V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    let result = {
        parent: [],
        children: [],
    };
    // let diaSection = {
    //     "webThickness": 12,
    //     "hstiffWidth": 270,
    //     "hstiffThickness": 12,
    //     "hstiffHeight": 362,
    //     "scallopRadius": 35,
    //     "ribHoleD": 42,
    //     "ribHoleR": 25,
    //     "holeBottomY": 330,
    //     "holeWidth": 700,
    //     "holeHeight": 700,
    //     "holeFilletR": 100,
    //     "holeStiffThickness": 10,
    //     "holeStiffhl": 860,
    //     "holeStiffvl": 860,
    //     "holeStiffmargin": 20,
    //     "holeStiffHeight": 100
    // } //  임시 입력변수
    let urib = sectionPoint.input.Urib;
    let lrib = sectionPoint.input.Lrib;
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];

    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    let diaHeight = tl.y - gradient * tr.x - bl.y;
    let urib2 = urib;
    urib2.ribHoleD = diaSection.ribHoleD;
    urib2.ribHoleR = diaSection.ribHoleR;
    let lrib2 = lrib;
    lrib2.ribHoleD = diaSection.ribHoleD;
    lrib2.ribHoleR = diaSection.ribHoleR;
    lrib.type = 0; //하부리브 스캘럽
    let sec = 1 / Math.cos(point.skew);
    const group = "Girder" + String(point.girderNum);
    let ref = toRefPoint(point, true); //skewed vertical plane

    let holeRect = [
        { x: sec * (diaSection.holeWidth / 2), y: bl.y + diaSection.holeBottomY },
        { x: sec * (-diaSection.holeWidth / 2), y: bl.y + diaSection.holeBottomY },
        { x: sec * (-diaSection.holeWidth / 2), y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
        { x: sec * (diaSection.holeWidth / 2), y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
    ];
    let holePoints = [];
    holePoints.push(...GetArcPoints(holeRect[0], holeRect[1], holeRect[2], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[1], holeRect[2], holeRect[3], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[2], holeRect[3], holeRect[0], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[3], holeRect[0], holeRect[1], diaSection.holeFilletR, 4));
    
    let mainPlatePts = vPlateGenV2([bl, br, tr, tl], point, [0, 1, 2, 3], diaSection.scallopRadius, urib2, lrib2);
    result["children"].push(
        new Extrude(mainPlatePts, diaSection.webThickness, { refPoint: ref, holes: [holePoints] }, "steelBox", {
            group: group,
            part: gridkey,
            key: "mainPlate",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    let holeCenter1 = { x: 0, y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness };
    let hstiff1 = [
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
    ];

    result["children"].push(
        new Extrude(
            hstiff1,
            diaSection.holeStiffThickness,
            { refPoint: new RefPoint(PointToSkewedGlobal(holeCenter1, point), ref.xAxis, 0) },
            "steelBox",
            { group: group, part: gridkey, key: "hStiff1", girder: point.girderNum, seg: point.segNum }
        )
    );
    let holeCenter2 = { x: 0, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin };
    result["children"].push(
        new Extrude(
            hstiff1,
            diaSection.holeStiffThickness,
            { refPoint: new RefPoint(PointToSkewedGlobal(holeCenter2, point), ref.xAxis, 0) },
            "steelBox",
            { group: group, part: gridkey, key: "hStiff2", girder: point.girderNum, seg: point.segNum }
        )
    );

    let vstiff1 = [
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
    ];
    let holeCenter3 = {
        x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };
    let holeCenter4 = { x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 };

    let cp3 = new RefPoint(PointToSkewedGlobal(holeCenter3, point), ref.xAxis, 0);
    let cp4 = new RefPoint(PointToSkewedGlobal(holeCenter4, point), ref.xAxis, 0);
    result["children"].push(
        new Extrude(vstiff1, diaSection.holeStiffThickness, { refPoint: { ...cp3, yRotation: Math.PI / 2 } }, "steelBox", {
            group: group,
            part: gridkey,
            key: "vStiff1",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    result["children"].push(
        new Extrude(vstiff1, diaSection.holeStiffThickness, { refPoint: { ...cp4, yRotation: Math.PI / 2 } }, "steelBox", {
            group: group,
            part: gridkey,
            key: "vStiff2",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );

    let hStiffCenter = { x: 0, y: bl.y + diaSection.hstiffHeight };
    let h1 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: -diaSection.hstiffWidth - diaSection.webThickness / 2 },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: -diaSection.holeStiffHeight - diaSection.webThickness / 2,
        },
        { x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness, y: -diaSection.webThickness / 2 },
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: -diaSection.webThickness / 2 },
    ];
    let h2D1 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: bl.y + diaSection.hstiffHeight },
        { x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness, y: bl.y + diaSection.hstiffHeight },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness,
        },
        { x: bl.x + lwCot * (diaSection.hstiffHeight + diaSection.hstiffThickness), y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness },
    ];
    // result["h1"] = hPlateGenV2(h1, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, h2D1, true, null, true);
    let ref1 = new RefPoint(PointToSkewedGlobal(hStiffCenter, point), point.xAxis, 0);
    
    let h2 = [
        { x: br.x + rwCot * diaSection.hstiffHeight, y: -diaSection.hstiffWidth - diaSection.webThickness / 2 },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: -diaSection.holeStiffHeight - diaSection.webThickness / 2,
        },
        { x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness, y: -diaSection.webThickness / 2 },
        { x: br.x + rwCot * diaSection.hstiffHeight, y: -diaSection.webThickness / 2 },
    ];
    let h3 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: diaSection.hstiffWidth + diaSection.webThickness / 2 },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: diaSection.holeStiffHeight + diaSection.webThickness / 2,
        },
        { x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness, y: diaSection.webThickness / 2 },
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: diaSection.webThickness / 2 },
    ];
    let h4 = [
        { x: br.x + rwCot * diaSection.hstiffHeight, y: diaSection.hstiffWidth + diaSection.webThickness / 2 },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: diaSection.holeStiffHeight + diaSection.webThickness / 2,
        },
        { x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness, y: diaSection.webThickness / 2 },
        { x: br.x + rwCot * diaSection.hstiffHeight, y: diaSection.webThickness / 2 },
    ];
    let tan = Math.tan(point.skew)
    for(let h of [h1, h2, h3, h4]){
        for (let pt of h){
            pt.y = pt.y+pt.x*tan
        }
    }

    result["children"].push(
        new Extrude(h1, diaSection.hstiffThickness, { refPoint: ref1 }, "steelBox", {
            group: group,
            part: gridkey,
            key: "h1",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    result["children"].push(
        new Extrude(h2, diaSection.hstiffThickness, { refPoint: ref1 }, "steelBox", {
            group: group,
            part: gridkey,
            key: "h2",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    result["children"].push(
        new Extrude(h3, diaSection.hstiffThickness, { refPoint: ref1 }, "steelBox", {
            group: group,
            part: gridkey,
            key: "h3",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    result["children"].push(
        new Extrude(h4, diaSection.hstiffThickness, { refPoint: ref1 }, "steelBox", {
            group: group,
            part: gridkey,
            key: "h4",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );

    return result;
}

export function DYdia0V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    let result = {
        parent: [],
        children: [],
    };
    // let diaSection = {
    //     "lowerThickness": 12,
    //     "lowerWidth": 250,
    //     "webHeight": 576,
    //     "upperThickness": 12,
    //     "upperWidth" : 250,
    //     "webThickness" : 12,
    //     "stiffWidth" : 150,
    //     "stiffWidth2" : 300,
    //     "filletR" : 200,
    //     "stiffThickness": 12,
    //     "scallopRadius": 35
    // } //  임시 입력변수

    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    let lflangePoint = sectionPoint.lflange;
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    // const rotationY = (skew - 90) * Math.PI / 180
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    let diaHeight = tl.y - gradient * tr.x - bl.y;

    let tan = Math.tan(point.skew);
    const group = "Girder" + String(point.girderNum);
    let ref = toRefPoint(point, true); //skewed vertical plane

    ///lower stiffener
    let lflangeModel = {};
    if (lflangePoint[0].length > 0) {
        let lowerPlate = [
            lflangePoint[0][1],
            { x: lflangePoint[0][1].x, y: lflangePoint[0][1].y - diaSection.lowerThickness },
            { x: lflangePoint[1][1].x, y: lflangePoint[1][1].y - diaSection.lowerThickness },
            lflangePoint[1][1],
        ];
        let lowerPlateL = lflangePoint[1][1].x - lflangePoint[0][1].x;
        let lowerPlate2 = [
            { x: 0, y: diaSection.lowerWidth / 2 },
            { x: 0, y: -diaSection.lowerWidth / 2 },
            { x: lowerPlateL, y: -diaSection.lowerWidth / 2 + tan * lowerPlateL},
            { x: lowerPlateL, y: diaSection.lowerWidth / 2 + tan * lowerPlateL},
        ];
        let lPoint = new RefPoint(PointToSkewedGlobal(lflangePoint[0][1], point), point.xAxis,0);
        result["children"].push(
            new Extrude(lowerPlate2, diaSection.lowerThickness, { refPoint: lPoint, dz : -diaSection.lowerThickness}, "steelBox", {
                group: group,
                part: gridkey,
                key: "lowerflange",
                girder: point.girderNum,
                seg: point.segNum,
            })
        );
    }
    let upperPlate = [
        { x: bl.x + lwCot * diaSection.webHeight, y: bl.y + diaSection.webHeight },
        { x: bl.x + lwCot * (diaSection.webHeight + diaSection.upperThickness), y: bl.y + diaSection.webHeight + diaSection.upperThickness },
        { x: br.x + rwCot * (diaSection.webHeight + diaSection.upperThickness), y: br.y + diaSection.webHeight + diaSection.upperThickness },
        { x: br.x + rwCot * diaSection.webHeight, y: br.y + diaSection.webHeight },
    ];
    let upperPlateL = upperPlate[3].x - upperPlate[0].x;
    let upperPlate2 = [
        { x: 0, y: diaSection.upperWidth / 2 },
        { x: 0, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: -diaSection.upperWidth / 2 + tan * upperPlateL},
        { x: upperPlateL, y: diaSection.upperWidth / 2 + tan * upperPlateL},
    ];
    let uPoint = new RefPoint(PointToSkewedGlobal(upperPlate[0], point), point.xAxis,0);
    result["children"].push(
        new Extrude(upperPlate2, diaSection.upperThickness, { refPoint: uPoint, dz : 0}, "steelBox", {
            group: group,
            part: gridkey,
            key: "upperflange",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    let centerPlate = [bl, br, upperPlate[3], upperPlate[0]];
    let mainPlatePts = vPlateGenV2(centerPlate, point, [0, 1, 2, 3], diaSection.scallopRadius, null, null);
    result["children"].push(
        new Extrude(mainPlatePts, diaSection.webThickness, { refPoint: ref }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webPlate",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    let stiffnerPoint = [tl, upperPlate[1]];
    let stiffWidth = diaSection.stiffWidth;
    let tan1 = gradient;
    let stiffner = PlateRestPoint(stiffnerPoint[0], stiffnerPoint[1], tan1, 0, stiffWidth);
    let addedPoint = [
        { x: upperPlate[1].x + diaSection.stiffWidth2, y: upperPlate[1].y },
        { x: upperPlate[1].x + diaSection.stiffWidth2, y: upperPlate[1].y + 50 },
        { x: upperPlate[1].x + diaSection.stiffWidth, y: upperPlate[1].y + 50 + diaSection.stiffWidth2 - diaSection.stiffWidth },
    ];

    let stiffnerPoints = [];
    stiffnerPoints.push(stiffner[0]);
    stiffnerPoints.push(stiffner[1]);
    stiffnerPoints.push(addedPoint[0], addedPoint[1]);
    stiffnerPoints.push(...GetArcPoints(addedPoint[1], addedPoint[2], stiffner[3], diaSection.filletR, 4));
    stiffnerPoints.push(stiffner[3]);
    
    let nStiffner = vPlateGenV2(stiffnerPoints, point, [0,1], diaSection.scallopRadius, null, null);
    result["children"].push(
        new Extrude(
            nStiffner,
            diaSection.stiffThickness,
            { refPoint: ref },
            "steelBox",
            { group: group, part: gridkey, key: "stiffner2", girder: point.girderNum, seg: point.segNum }
        )
    );

    stiffnerPoint = [tr, upperPlate[2]];
    tan1 = gradient;
    stiffner = PlateRestPoint(stiffnerPoint[0], stiffnerPoint[1], tan1, 0, -stiffWidth);
    addedPoint = [
        { x: upperPlate[2].x - diaSection.stiffWidth2, y: upperPlate[2].y },
        { x: upperPlate[2].x - diaSection.stiffWidth2, y: upperPlate[2].y + 50 },
        { x: upperPlate[2].x - diaSection.stiffWidth, y: upperPlate[2].y + 50 + diaSection.stiffWidth2 - diaSection.stiffWidth },
    ];
    stiffnerPoints = [];
    stiffnerPoints.push(stiffner[0]);
    stiffnerPoints.push(stiffner[1]);
    stiffnerPoints.push(addedPoint[0], addedPoint[1]);
    stiffnerPoints.push(...GetArcPoints(addedPoint[1], addedPoint[2], stiffner[3], diaSection.filletR, 4));
    stiffnerPoints.push(stiffner[3]);
    
    nStiffner = vPlateGenV2(stiffnerPoints, point, [0,1], diaSection.scallopRadius, null, null);
    result["children"].push(
        new Extrude(
            nStiffner,
            diaSection.stiffThickness,
            { refPoint: ref },
            "steelBox",
            { group: group, part: gridkey, key: "stiffner3", girder: point.girderNum, seg: point.segNum }
        )
    );
    
    return result;
}

export function DYdia1V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    //ds 입력변수
    let result = {
        parent: [],
        children: [],
    };
    // let diaSection = {
    //     "lowerHeight": 300,
    //     "lowerThickness": 12,
    //     "lowerWidth": 250,
    //     "upperHeight": 900,
    //     "upperThickness": 12,
    //     "upperWidth": 250,
    //     "webThickness": 12,
    //     "stiffWidth": 150,
    //     "stiffThickness": 12,
    //     "scallopRadius": 35
    // } //  임시 입력변수

    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    // const rotationY = (skew - 90) * Math.PI / 180
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    let diaHeight = tl.y - gradient * tr.x - bl.y;

    let tan = Math.tan(point.skew);
    const group = "Girder" + String(point.girderNum);
    let ref = toRefPoint(point, true); //skewed vertical plane

    ///lower stiffener
    let lowerPlate = [
        { x: bl.x + lwCot * diaSection.lowerHeight, y: bl.y + diaSection.lowerHeight },
        { x: bl.x + lwCot * (diaSection.lowerHeight - diaSection.lowerThickness), y: bl.y + diaSection.lowerHeight - diaSection.lowerThickness },
        { x: br.x + rwCot * (diaSection.lowerHeight - diaSection.lowerThickness), y: br.y + diaSection.lowerHeight - diaSection.lowerThickness },
        { x: br.x + rwCot * diaSection.lowerHeight, y: br.y + diaSection.lowerHeight },
    ];
    let lowerPlateL = lowerPlate[3].x - lowerPlate[0].x;
    let lowerPlate2 = [
        { x: 0, y: diaSection.lowerWidth / 2 },
        { x: 0, y: -diaSection.lowerWidth / 2 },
        { x: lowerPlateL, y: -diaSection.lowerWidth / 2 + tan * lowerPlateL},
        { x: lowerPlateL, y: diaSection.lowerWidth / 2  + tan * lowerPlateL },
    ];
    let lPoint = new RefPoint(PointToSkewedGlobal(lowerPlate[0],point), point.xAxis,0);
    result["children"].push(
        new Extrude(lowerPlate2, diaSection.lowerThickness, { refPoint: lPoint, dz : -diaSection.lowerThickness}, "steelBox", {
            group: group,
            part: gridkey,
            key: "lowerflange",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    let upperPlate = [
        { x: bl.x + lwCot * diaSection.upperHeight, y: bl.y + diaSection.upperHeight },
        { x: bl.x + lwCot * (diaSection.upperHeight + diaSection.upperThickness), y: bl.y + diaSection.upperHeight + diaSection.upperThickness },
        { x: br.x + rwCot * (diaSection.upperHeight + diaSection.upperThickness), y: br.y + diaSection.upperHeight + diaSection.upperThickness },
        { x: br.x + rwCot * diaSection.upperHeight, y: br.y + diaSection.upperHeight },
    ];
    let upperPlateL = upperPlate[3].x - upperPlate[0].x;
    let upperPlate2 = [
        { x: 0, y: diaSection.upperWidth / 2 },
        { x: 0, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: -diaSection.upperWidth / 2 + tan * upperPlateL},
        { x: upperPlateL, y: diaSection.upperWidth / 2 + tan * upperPlateL},
    ];
    let uPoint = new RefPoint(PointToSkewedGlobal(upperPlate[0], point), point.xAxis,0);
    result["children"].push(
        new Extrude(upperPlate2, diaSection.upperThickness, { refPoint: uPoint, dz : 0}, "steelBox", {
            group: group,
            part: gridkey,
            key: "upperflange",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    let centerPlate = [lowerPlate[0], lowerPlate[3], upperPlate[3], upperPlate[0]];
    let mainPlatePts = vPlateGenV2(centerPlate, point, [0, 1, 2, 3], diaSection.scallopRadius, null, null);
    result["children"].push(
        new Extrude(mainPlatePts, diaSection.webThickness, { refPoint: ref }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webPlate",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    let stiffnerPoint = [
        [bl, lowerPlate[1]],
        [br, lowerPlate[2]],
        [tl, upperPlate[1]],
        [tr, upperPlate[2]],
    ];
    for (let i = 0; i < 4; i++) {
        let stiffWidth = i % 2 === 0 ? diaSection.stiffWidth : -diaSection.stiffWidth;
        let tan1 = i < 2 ? 0 : gradient;
        let stiffner = PlateRestPoint(stiffnerPoint[i][0], stiffnerPoint[i][1], tan1, 0, stiffWidth);
        let nStiffner = vPlateGenV2(stiffner, point, [0, 1], diaSection.scallopRadius, null, null);
        result["children"].push(
            new Extrude(
                nStiffner,
                diaSection.stiffThickness,
                { refPoint: ref },
                "steelBox",
                { group: group, part: gridkey, key: "stiffner" + i.toFixed(0), girder: point.girderNum, seg: point.segNum }
            )
        );
    }
    return result;
}


export function VstiffShapeDictV2(
    gridPoint,
    sectionPointDict,
    vStiffLayout,
    vStiffSectionList,
    sectionDB
  ) {
    const section = 2;
    let result = { parent: [], children: [] };
    for (let i = 0; i < vStiffLayout.length; i++) {
      for (let j = 0; j < vStiffLayout[i].length; j++) {
        let gridkey = "G" + (i + 1).toFixed(0) + "V" + (j + 1).toFixed(0); //vStiffLayout[i][position];
        let vSectionName = vStiffLayout[i][j][section]
        let vSection = vStiffSectionList[vSectionName];
        let sectionPoint = sectionPointDict[gridkey].forward;
        if (vFnV2[vSectionName]) {
          let dia = vFnV2[vSectionName](sectionPoint, gridPoint[gridkey], vSection, gridkey, vSectionName, sectionDB);
          result["children"].push(...dia.children)
          result["parent"].push(...dia.parent)
        }
      }
    }
    return result;
  }

  const vFnV2 = {
    "수직보강1": function (sectionPoint, gridPoint, vSection, gridkey, diaSectionName) { return DYVstiff0V2(sectionPoint, gridPoint, vSection, gridkey, diaSectionName) },
    "수직보강2": function (sectionPoint, gridPoint, vSection, gridkey, diaSectionName) { return DYVstiff1V2(sectionPoint, gridPoint, vSection, gridkey, diaSectionName) },
    "박스부-수직보강": function (sectionPoint, gridPoint, vSection, gridkey, diaSectionName) { return DYdia4V2(sectionPoint, gridPoint, vSection, gridkey, diaSectionName) },
  }

  export function DYdia4V2(sectionPoint, point, diaSection, gridkey, vSectionName) {
    let result = {
        parent: [],
        children: []
      };
    // let diaSection = {
    //     "webHeight": 576,
    //     "upperTopThickness": 10,
    //     "upperTopWidth": 200,
    //     "webThickness": 12,
    //     "stiffWidth": 160,
    //     "stiffThickness": 12,
    //     "scallopRadius": 35,
    //     "ribHoleD": 42,
    //     "ribHoleR": 25
    // } //  임시 입력변수
  
    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    let urib = sectionPoint.input.Urib;
    // let lrib = sectionPoint.input.Lrib;
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    // const rotationY = (point.skew - 90) * Math.PI / 180
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y)
    const rwCot = (tr.x - br.x) / (tr.y - br.y)
    const gradient = (tr.y - tl.y) / (tr.x - tl.x)
    const gradCos = (tr.x - tl.x) / Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2)
    // const gradSin = gradient * gradCos
    let tan = Math.tan(point.skew);
    const group = "Girder" + String(point.girderNum);
    let ref = toRefPoint(point, true); //skewed vertical plane  
  
    let webPlate = [{ x: tl.x - lwCot * diaSection.webHeight, y: tl.y - diaSection.webHeight },
    { x: tr.x - rwCot * diaSection.webHeight, y: tr.y - diaSection.webHeight }, tr, tl]; // 첫번째 면이 rib에 해당되도록
    let urib2 = urib
    urib2.ribHoleD = diaSection.ribHoleD
    urib2.ribHoleR = diaSection.ribHoleR
    let mainPlatePts = vPlateGenV2(webPlate, point, [0, 1, 2, 3], diaSection.scallopRadius, urib2, null);
    result["children"].push(
        new Extrude(mainPlatePts, diaSection.webThickness, { refPoint: ref }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webPlate",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );
    let centerPoint = PointToSkewedGlobal({ x: 0, y: -gradient * tl.x + tl.y - diaSection.webHeight - diaSection.upperTopThickness }, point);
    // let l = (tr.x - rwCot * (dsi.webHeight + dsi.upperTopThickness)) - (tl.x - lwCot * (dsi.webHeight + dsi.upperTopThickness)) / gradCos
    let lowerPlate2 = [{ x: (tl.x - lwCot * (diaSection.webHeight + diaSection.upperTopThickness)) / gradCos, y: - diaSection.upperTopWidth / 2 },
    { x: (tl.x - lwCot * (diaSection.webHeight + diaSection.upperTopThickness)) / gradCos, y: diaSection.upperTopWidth / 2 },
    { x: (tr.x - rwCot * (diaSection.webHeight + diaSection.upperTopThickness)) / gradCos, y: diaSection.upperTopWidth / 2 },
    { x: (tr.x - rwCot * (diaSection.webHeight + diaSection.upperTopThickness)) / gradCos, y: -diaSection.upperTopWidth / 2 }];
    let lowerPlate = [webPlate[0],
    { x: tl.x - lwCot * (diaSection.webHeight + diaSection.upperTopThickness), y: tl.y - diaSection.webHeight - diaSection.upperTopThickness },
    { x: tr.x - rwCot * (diaSection.webHeight + diaSection.upperTopThickness), y: tr.y - diaSection.webHeight - diaSection.upperTopThickness },
    webPlate[1]
    ]
    lowerPlate2 = lowerPlate2.map(pt => new Point(pt.x, pt.y+pt.x*tan))
    let lPoint = {...(new RefPoint(centerPoint, point.xAxis,0)), yRotation : -Math.atan(gradient)};
    result["children"].push(
        new Extrude(lowerPlate2, diaSection.upperTopThickness, { refPoint: lPoint, dz : 0}, "steelBox", {
            group: group,
            part: gridkey,
            key: "lowerflange",
            girder: point.girderNum,
            seg: point.segNum,
        })
    );

    let stiffnerPoint = [[bl, lowerPlate[1]], [br, lowerPlate[2]]];
    let stiffnerModel = [];
    for (let i = 0; i < stiffnerPoint.length; i++) {
      let stiffWidth = i % 2 === 0 ? diaSection.stiffWidth : -diaSection.stiffWidth;
      let stiffner = PlateRestPoint(stiffnerPoint[i][0], stiffnerPoint[i][1], 0, gradient, stiffWidth)
      let side2D = i % 2 === 0 ? null : [0, 3, 2, 1];
      let nStiffner = vPlateGenV2(stiffner, point, [0, 1], diaSection.scallopRadius, null, null);
      result["children"].push(
          new Extrude(
              nStiffner,
              diaSection.stiffThickness,
              { refPoint: ref },
              "steelBox",
              { group: group, part: gridkey, key: "stiffner" + i.toFixed(0), girder: point.girderNum, seg: point.segNum }
          )
      );
    }
    return result
  }
  
  export function DYVstiff0V2(sectionPoint, point, vSection, gridkey, vSectionName) {
    //ds 입력변수
    // let vSection = {
    //   "stiffWidth": 150,
    //   "stiffThickness": 12,
    //   "scallopRadius": 35,
    // } //  임시 입력변수
  
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    const gradient = (tr.y - tl.y) / (tr.x - tl.x)
  
    let result = {
      parent: [],
      children: []
    };
    let tan = Math.tan(point.skew);
    const group = "Girder" + String(point.girderNum);
    let ref = toRefPoint(point, true); //skewed vertical plane

    let lowerPoints = [
      { x: bl.x, y: bl.y },
      { x: br.x, y: br.y }
    ];
  
    let left = PlateRestPoint(lowerPoints[0], tl, 0, gradient, vSection.stiffWidth)
    let lStiffner = vPlateGenV2(left, point, [0, 1], vSection.scallopRadius, null, null);
    result["children"].push(
        new Extrude(
            lStiffner,
            vSection.stiffThickness,
            { refPoint: ref },
            "steelBox",
            { group: group, part: gridkey, key: "left", girder: point.girderNum, seg: point.segNum }
        )
    );
    let right = PlateRestPoint(lowerPoints[1], tr, 0, gradient, -vSection.stiffWidth);
    let rStiffner = vPlateGenV2(right, point, [0, 1], vSection.scallopRadius, null, null);
    result["children"].push(
        new Extrude(
            rStiffner,
            vSection.stiffThickness,
            { refPoint: ref },
            "steelBox",
            { group: group, part: gridkey, key: "right", girder: point.girderNum, seg: point.segNum }
        )
    );
    return result
  }

  export function DYVstiff1V2(sectionPoint, point, vSection, gridkey, vSectionName) {
    //ds 입력변수
    // let vSection = {
    //   "lowerSpacing": 50,
    //   "stiffWidth": 150,
    //   "stiffThickness": 12,
    //   "scallopRadius": 35,
    //   "chamfer": 130
    // } //  임시 입력변수
  
    const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    let result = {
      parent: [],
      children: []
    };
    let tan = Math.tan(point.skew);
    const group = "Girder" + String(point.girderNum);
    let ref = toRefPoint(point, true); //skewed vertical plane

    // const rotationY = (skew - 90) * Math.PI / 180
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y)
    const rwCot = (tr.x - br.x) / (tr.y - br.y)
    const gradient = (tr.y - tl.y) / (tr.x - tl.x)
  
    let lowerPoints = [
      { x: bl.x + lwCot * vSection.lowerSpacing, y: bl.y + vSection.lowerSpacing },
      { x: br.x + rwCot * vSection.lowerSpacing, y: br.y + vSection.lowerSpacing }
    ];

    let left = PlateRestPoint(lowerPoints[0], tl, 0, gradient, vSection.stiffWidth)
    let leftPoints = [];
    leftPoints.push(left[0])
    leftPoints.push(left[1]);
    leftPoints.push(left[2])
    leftPoints.push(...scallop(left[2], left[3], left[0], vSection.chamfer, 1));
    let lStiffner = vPlateGenV2(leftPoints, point, [1], vSection.scallopRadius, null, null);
    result["children"].push(
        new Extrude(
            lStiffner,
            vSection.stiffThickness,
            { refPoint: ref },
            "steelBox",
            { group: group, part: gridkey, key: "left", girder: point.girderNum, seg: point.segNum }
        )
    );
    let right = PlateRestPoint(lowerPoints[1], tr, 0, gradient, -vSection.stiffWidth)
    let rightPoints = [];
    rightPoints.push(right[0])
    rightPoints.push(right[1]);
    rightPoints.push(right[2])
    rightPoints.push(...scallop(right[2], right[3], right[0], vSection.chamfer, 1));
    let rStiffner = vPlateGenV2(rightPoints, point, [1], vSection.scallopRadius, null, null);
    result["children"].push(
        new Extrude(
            rStiffner,
            vSection.stiffThickness,
            { refPoint: ref },
            "steelBox",
            { group: group, part: gridkey, key: "right", girder: point.girderNum, seg: point.segNum }
        )
    );
    return result
  }


  export function XbeamDictV2(nameToPointDict, sectionPointDict, xbeamLayout, xbeamSectionList, sectionDB) {
    const iNode = 0;
    const jNode = 1;
    const section = 2;

    let result = { parent: [], children: [] };
    // let xbeamSectionDict = {};
    let xbeamData = [];

    for (let i = 0; i < xbeamLayout.length; i++) {
        let iNodekey = xbeamLayout[i][iNode];
        let jNodekey = xbeamLayout[i][jNode];
        let xbeamSectionName = xbeamLayout[i][section];
        let xbeamSection = xbeamSectionList[xbeamSectionName];

        let iSectionPoint = sectionPointDict[iNodekey].forward;
        let jSectionPoint = sectionPointDict[jNodekey].forward;
        let iPoint = nameToPointDict[iNodekey];
        let jPoint = nameToPointDict[jNodekey];
        let xbData = [];
        let xbSection = [];
        let iRight = PointToSkewedGlobal({ x: iSectionPoint.input.B2 / 2, y: 0 }, iPoint);
        let jLeft = PointToSkewedGlobal({ x: -jSectionPoint.input.B2 / 2, y: 0 }, jPoint);

        let sectionID = iSectionPoint.input.wuf.toFixed(0)
                        +iSectionPoint.input.wlf.toFixed(0)
                        +iSectionPoint.input.tlf.toFixed(0)
                        +iSectionPoint.input.tuf.toFixed(0)
                        +iSectionPoint.input.tw.toFixed(0);
                        +jSectionPoint.input.wuf.toFixed(0)
                        +jSectionPoint.input.wlf.toFixed(0)
                        +jSectionPoint.input.tlf.toFixed(0)
                        +jSectionPoint.input.tuf.toFixed(0)
                        +jSectionPoint.input.tw.toFixed(0);

        if (xbeamFnV2[xbeamSectionName]) {
            let xbeam = xbeamFnV2[xbeamSectionName](
                iRight,
                jLeft,
                iSectionPoint,
                jSectionPoint,
                xbeamSection,
                iNodekey,
                jNodekey,
                xbeamSectionName,
                sectionDB
            );
            
            result["children"].push(...xbeam.children);
            // let skewID = String(Math.round(xbeam.parent[0].point.skew))
            // xbeam.parent[0].id = skewID + sectionID+xbeam.parent[0].id
            result["parent"].push(...xbeam.parent);
            // xbeam.result["id"] = xbeamLayout[i][section] + xbeam.result["id"]
            // xbeamSectionDict[iNodekey + jNodekey] = xbeam.result
            // if (xbeam["parent"][0].data && xbeam["parent"][0].section) {
            //     xbData = xbeam["parent"][0].data;
            //     xbSection = xbeam["parent"][0].section;
            // }
            // let key = i < 10 ? "X0" + i : "X" + i;
            // let isKframe = xbeamLayout[i][section].includes("K형") ? true : false;
            // xbeamData.push({
            //     inode: iNodekey,
            //     jnode: jNodekey,
            //     key: key,
            //     isKframe: isKframe,
            //     data: xbData,
            //     section: xbSection,
            // });
        }
    }
    return { xbeamDict: result, xbeamData };
}

const xbeamFnV2 = {
    박스부: function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return DYXbeam2V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    박스부2: function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return DYXbeam2V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    "플레이트-상": function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return DYXbeam1V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    "플레이트-하": function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return DYXbeam3V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    "플레이트-중": function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return DYXbeam4V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
};

export function DYXbeam4V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xs, iNodekey, jNodekey, xbeamSectionName) {
    // let xs = {
    //   "bracketLength": 541,
    //   "bracketWidth": 450,
    //   "bracketFilletR": 100,
    //   "lflangeHeight": 300,
    //   "webHeight": 576,
    //   "webThickness": 12,
    //   "flangeWidth": 250,
    //   "flangeThickness": 12,
    //   "stiffThickness": 12,
    //   "stiffWidth": 150,
    //   "scallopRadius": 25,
    //   "webJointThickness": 10,
    //   "webJointWidth": 330,
    //   "webJointHeight": 440,
    //   "flangeJointThickness": 10,
    //   "flangeJointLength": 480,
    //   "flangeJointWidth": 80
    // }
    let wBolt = {
        P: 90,
        G: 75,
        pNum: 5,
        gNum: 2,
        size: 37,
        dia: 22,
        t: 14,
    };
    let fBolt = {
        P: 170,
        G: 75,
        pNum: 2,
        gNum: 3,
        size: 37,
        dia: 22,
        t: 14,
    };
    const group = "CrossBeam";

    // let result = { type: "xbeam" };
    let tlength = Math.sqrt((iPoint.x - jPoint.x) ** 2 + (iPoint.y - jPoint.y) ** 2);
    let vec = { x: (jPoint.x - iPoint.x) / tlength, y: (jPoint.y - iPoint.y) / tlength };
    let dOffset = (jPoint.offset - iPoint.offset) / 2;
    let dz = (jPoint.z - iPoint.z) / 2;
    let cw = iPoint.normalCos * vec.y - iPoint.normalSin * vec.x > 0 ? 1 : -1; // 반시계방향의 경우 1
    let dotVec = (iPoint.normalCos * vec.x + iPoint.normalSin * vec.y).toFixed(4) * 1;

    let centerPoint = 
    {   ...iPoint,
        ...(new RefPoint(new Point((iPoint.x + jPoint.x) / 2, (iPoint.y + jPoint.y) / 2, (iPoint.z + jPoint.z) / 2,), iPoint.xAxis, Math.PI/2)),
        offset : (iPoint.offset + jPoint.offset) / 2,
        skew : cw * Math.acos(dotVec)
    }
    let vcenterPoint = 
    {   ...iPoint,
        ...(new RefPoint(new Point((iPoint.x + jPoint.x) / 2, (iPoint.y + jPoint.y) / 2, (iPoint.z + jPoint.z) / 2,), new Point(vec.x, vec.y), Math.PI/2)),
        offset : (iPoint.offset + jPoint.offset) / 2,
        skew : cw * Math.acos(dotVec)
    }
    let rad = cw * Math.acos(dotVec);
    let tan = Math.tan(rad);

    // const rotationY = (centerPoint.skew - 90) * Math.PI / 180

    //폐합시를 고려하여 예외처리 필요
    let ufl, ufr;
    if (iSectionPoint.uflange[2].length > 0) {
        ufl = { x: iSectionPoint.uflange[2][1].x - dOffset, y: iSectionPoint.uflange[2][1].y - dz };
    } else {
        ufl = { x: iSectionPoint.uflange[1][0].x - dOffset, y: iSectionPoint.uflange[1][0].y - dz };
    }
    if (jSectionPoint.uflange[2].length > 0) {
        ufr = { x: jSectionPoint.uflange[2][0].x + dOffset, y: jSectionPoint.uflange[2][0].y + dz };
    } else {
        ufr = { x: jSectionPoint.uflange[0][0].x + dOffset, y: jSectionPoint.uflange[0][0].y + dz };
    }

    let tl = { x: iSectionPoint.web[1][2].x - dOffset, y: iSectionPoint.web[1][2].y - dz };
    let tr = { x: jSectionPoint.web[0][2].x + dOffset, y: jSectionPoint.web[0][2].y + dz };
    let bl = { x: iSectionPoint.web[1][3].x - dOffset, y: iSectionPoint.web[1][3].y - dz };
    let br = { x: jSectionPoint.web[0][3].x + dOffset, y: jSectionPoint.web[0][3].y + dz };
    let result = { parent: [], children: [] };
    let gridkey = iNodekey + jNodekey;
    // result["id"] = tl.x.toFixed(0) + tl.y.toFixed(0) + tr.x.toFixed(0) + tr.y.toFixed(0) + bl.x.toFixed(0) + bl.y.toFixed(0) + br.x.toFixed(0) + br.y.toFixed(0)
    // result["point"] = centerPoint
    let uGradient = (ufr.y - ufl.y) / (ufr.x - ufl.x);
    let lGradient = (br.y - bl.y) / (br.x - bl.x);
    // let uRad = -Math.atan(uGradient)
    let lRad = -Math.atan(lGradient);

    let lwebPlate = PlateRestPoint(
        { x: bl.x, y: bl.y + xs.lflangeHeight },
        { x: bl.x, y: bl.y + xs.webHeight + xs.lflangeHeight },
        lGradient,
        lGradient,
        xs.bracketLength
    );
    let lstiff = PlateRestPoint({ x: bl.x, y: bl.y + xs.lflangeHeight - xs.flangeThickness }, bl, lGradient, 0, xs.stiffWidth);
    let lstiff2 = PlateRestPoint(
        { x: bl.x, y: bl.y + xs.lflangeHeight + xs.webHeight + xs.flangeThickness },
        tl,
        lGradient,
        uGradient,
        xs.stiffWidth
    );
    let rwebPlate = PlateRestPoint(
        { x: br.x, y: br.y + xs.lflangeHeight },
        { x: br.x, y: br.y + xs.webHeight + xs.lflangeHeight },
        lGradient,
        lGradient,
        -xs.bracketLength
    );
    let rstiff = PlateRestPoint({ x: br.x, y: br.y + xs.lflangeHeight - xs.flangeThickness }, br, lGradient, 0, -xs.stiffWidth);
    let rstiff2 = PlateRestPoint(
        { x: br.x, y: br.y + xs.lflangeHeight + xs.webHeight + xs.flangeThickness },
        tr,
        lGradient,
        uGradient,
        -xs.stiffWidth
    );
    let webBracketModel0 = vPlateGenV2(lwebPlate, vcenterPoint, [], 0, null, null); //xs.webThickness
    let webBracketModel1 = vPlateGenV2(rwebPlate, vcenterPoint, [], 0, null, null); // xs.webThickness, 
    let stiffnerModel0 = vPlateGenV2(lstiff, vcenterPoint, [0, 1], xs.scallopRadius, null, null, []); //xs.stiffThickness
    let stiffnerModel1 = vPlateGenV2(rstiff, vcenterPoint, [0, 1], xs.scallopRadius, null, null); //xs.stiffThickness
    let stiffnerModel2 = vPlateGenV2(lstiff2, vcenterPoint, [0, 1], xs.scallopRadius, null, null); //xs.stiffThickness 
    let stiffnerModel3 = vPlateGenV2(rstiff2, vcenterPoint, [0, 1], xs.scallopRadius, null, null); //xs.stiffThickness
    
    result["children"].push(
        new Extrude(webBracketModel0, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webBracket0",
        }),
        new Extrude(webBracketModel1, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webBracket1",
        }),
        new Extrude(stiffnerModel0, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner0",
        }),
        new Extrude(stiffnerModel1, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner1",
        }),
        new Extrude(stiffnerModel2, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner2",
        }),
        new Extrude(stiffnerModel3, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner3",
        }),
    );

    let bracketPoint = [lwebPlate[0], rwebPlate[0], lwebPlate[1], rwebPlate[1]];
    let bracketModel = [];
    let skewSin = (Math.sin(centerPoint.skew) * xs.flangeWidth) / 2;
    for (let i = 0; i < 4; i++) {
        let sign = i % 2 === 0 ? 1 : -1;
        let grad = lRad;
        let bracketLength = xs.bracketLength;
        let z = i < 2 ? -xs.flangeThickness : 0;
        let thickness = i < 2 ? -xs.flangeThickness : xs.flangeThickness;
        let lowerbracket1 = [
            { x: 0, y: xs.bracketWidth / 2 },
            { x: sign * 20, y: xs.bracketWidth / 2 },
            { x: sign * 20, y: xs.flangeWidth / 2 },
            { x: sign * bracketLength - skewSin, y: xs.flangeWidth / 2 },
            { x: sign * bracketLength + skewSin, y: -xs.flangeWidth / 2 },
            { x: sign * 20, y: -xs.flangeWidth / 2 },
            { x: sign * 20, y: -xs.bracketWidth / 2 },
            { x: 0, y: -xs.bracketWidth / 2 },
        ];
        lowerbracket1 = lowerbracket1.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
        let bracketShape = [
            lowerbracket1[0],
            lowerbracket1[1],
            ...GetFilletPoints2D(lowerbracket1[1], lowerbracket1[2], lowerbracket1[3], xs.bracketFilletR, 4),
            lowerbracket1[3],
            lowerbracket1[4],
            ...GetFilletPoints2D(lowerbracket1[4], lowerbracket1[5], lowerbracket1[6], xs.bracketFilletR, 4),
            lowerbracket1[6],
            lowerbracket1[7],
        ];
        // let top2D = i < 2 ? false : true;
        // let t2 = i % 2 === 0 ? iSectionPoint.input.tw : jSectionPoint.input.tw;
        let cp = {...(new RefPoint(PointToSkewedGlobal(bracketPoint[i], centerPoint), centerPoint.xAxis, 0)), yRotation : grad};
        result["children"].push(
            new Extrude(bracketShape, xs.flangeThickness, { refPoint: cp, dz : z}, "steelBox", {
                group: group,
                part: gridkey,
                key: "bracket" + i.toFixed(0),
            })
        );
    }
    let webPlate = [lwebPlate[3], rwebPlate[3], rwebPlate[2], lwebPlate[2]];
    let mainPlatePts = vPlateGenV2(webPlate, vcenterPoint,[], 0, null, null);
    result["children"].push(
        new Extrude(mainPlatePts, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webPlate",

        })
    );

    let uPoint = {...(new RefPoint(PointToSkewedGlobal(lwebPlate[2], centerPoint), centerPoint.xAxis, 0)), yRotation : lRad}
    let l = Math.sqrt((lwebPlate[3].x - rwebPlate[3].x) ** 2 + (lwebPlate[3].y - rwebPlate[3].y) ** 2);
    let uflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: l + skewSin, y: -xs.flangeWidth / 2 },
        { x: l - skewSin, y: xs.flangeWidth / 2 },
    ];
    uflangePlate = uflangePlate.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
    result["children"].push(
        new Extrude(uflangePlate, xs.flangeThickness, { refPoint: uPoint, dz : 0}, "steelBox", {
            group: group,
            part: gridkey,
            key: "upperflange",
        })
    );
    let lPoint = {...(new RefPoint(PointToSkewedGlobal(lwebPlate[3], centerPoint), centerPoint.xAxis, 0)), yRotation : lRad}
    let ll = Math.sqrt((lwebPlate[2].x - rwebPlate[2].x) ** 2 + (lwebPlate[2].y - rwebPlate[2].y) ** 2);
    let lflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: ll + skewSin, y: -xs.flangeWidth / 2 },
        { x: ll - skewSin, y: xs.flangeWidth / 2 },
    ];
    lflangePlate = lflangePlate.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
    result["children"].push(
        new Extrude(lflangePlate, xs.flangeThickness, { refPoint: lPoint, dz : -xs.flangeThickness}, "steelBox", {
            group: group,
            part: gridkey,
            key: "lowerflange",
        })
    );
    let joint = IbeamJointV2(webPlate, centerPoint, xs, wBolt, fBolt);
    for (let i in joint) {
        joint[i]["meta"] = { ...joint[i]["meta"], group : group, part: gridkey, key: i }
        result["children"].push(joint[i]);
    }
    return result;
}

export function DYXbeam3V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xs, iNodekey, jNodekey, xbeamSectionName) {
    let result = { parent: [], children: [] };
    // let xbeamSection = {
    //   "bracketLength": 554,
    //   "bracketWidth": 450,
    //   "bracketFilletR": 100,
    //   "webHeight": 576,
    //   "webThickness": 12,
    //   "flangeWidth": 250,
    //   "flangeThickness": 12,
    //   "stiffThickness": 12,
    //   "stiffWidth": 150,
    //   "stiffWidth2": 300,
    //   "stiffFilletR": 200,
    //   "scallopRadius": 25,
    //   "webJointThickness": 10,
    //   "webJointWidth": 330,
    //   "webJointHeight": 440,
    //   "flangeJointThickness": 10,
    //   "flangeJointLength": 480,
    //   "flangeJointWidth": 80
    // }
    let wBolt = {
        P: 90,
        G: 75,
        pNum: 5,
        gNum: 2,
        size: 37,
        dia: 22,
        t: 14,
    };
    let fBolt = {
        P: 170,
        G: 75,
        pNum: 2,
        gNum: 3,
        size: 37,
        dia: 22,
        t: 14,
    };
    const group = "CrossBeam";
    let tlength = Math.sqrt((iPoint.x - jPoint.x) ** 2 + (iPoint.y - jPoint.y) ** 2);
    let vec = { x: (jPoint.x - iPoint.x) / tlength, y: (jPoint.y - iPoint.y) / tlength };
    let dOffset = (jPoint.offset - iPoint.offset) / 2;
    let dz = (jPoint.z - iPoint.z) / 2;
    let cw = iPoint.normalCos * vec.y - iPoint.normalSin * vec.x > 0 ? 1 : -1; // 반시계방향의 경우 1
    let dotVec = (iPoint.normalCos * vec.x + iPoint.normalSin * vec.y).toFixed(4) * 1;
    let centerPoint = 
    {   ...iPoint,
        ...(new RefPoint(new Point((iPoint.x + jPoint.x) / 2, (iPoint.y + jPoint.y) / 2, (iPoint.z + jPoint.z) / 2,), iPoint.xAxis, Math.PI/2)),
        offset : (iPoint.offset + jPoint.offset) / 2,
        skew : cw * Math.acos(dotVec)
    }
    let vcenterPoint = 
    {   ...iPoint,
        ...(new RefPoint(new Point((iPoint.x + jPoint.x) / 2, (iPoint.y + jPoint.y) / 2, (iPoint.z + jPoint.z) / 2,), new Point(vec.x, vec.y), Math.PI/2)),
        offset : (iPoint.offset + jPoint.offset) / 2,
        skew : cw * Math.acos(dotVec)
    }
    let rad = cw * Math.acos(dotVec);
    let tan = Math.tan(rad);

    //폐합시를 고려하여 예외처리 필요
    let ufl, ufr, lfl, lfr;
    if (iSectionPoint.uflange[2].length > 0) {
        ufl = { x: iSectionPoint.uflange[2][1].x - dOffset, y: iSectionPoint.uflange[2][1].y - dz };
    } else {
        ufl = { x: iSectionPoint.uflange[1][0].x - dOffset, y: iSectionPoint.uflange[1][0].y - dz };
    }
    if (jSectionPoint.uflange[2].length > 0) {
        ufr = { x: jSectionPoint.uflange[2][0].x + dOffset, y: jSectionPoint.uflange[2][0].y + dz };
    } else {
        ufr = { x: jSectionPoint.uflange[0][0].x + dOffset, y: jSectionPoint.uflange[0][0].y + dz };
    }
    if (iSectionPoint.lflange[2].length > 0) {
        lfl = { x: iSectionPoint.lflange[2][1].x - dOffset, y: iSectionPoint.lflange[2][1].y - dz };
    } else {
        lfl = { x: iSectionPoint.lflange[1][0].x - dOffset, y: iSectionPoint.lflange[1][0].y - dz };
    }
    if (jSectionPoint.lflange[2].length > 0) {
        lfr = { x: jSectionPoint.lflange[2][0].x + dOffset, y: jSectionPoint.lflange[2][0].y + dz };
    } else {
        lfr = { x: jSectionPoint.lflange[0][0].x + dOffset, y: jSectionPoint.lflange[0][0].y + dz };
    }

    let tl = { x: iSectionPoint.web[1][2].x - dOffset, y: iSectionPoint.web[1][2].y - dz };
    let tr = { x: jSectionPoint.web[0][2].x + dOffset, y: jSectionPoint.web[0][2].y + dz };
    let bl = { x: iSectionPoint.web[1][3].x - dOffset, y: iSectionPoint.web[1][3].y - dz };
    let br = { x: jSectionPoint.web[0][3].x + dOffset, y: jSectionPoint.web[0][3].y + dz };

    let gridkey = iNodekey + jNodekey;

    let tGradient = (tr.y - tl.y) / (tr.x - tl.x);
    let uGradient = (br.y - bl.y) / (br.x - bl.x);
    let lGradient = (lfr.y - lfl.y) / (lfr.x - lfl.x);
    let uRad = -Math.atan(uGradient);
    let lRad = -Math.atan(lGradient);

    let lwebPlate = [
        { x: bl.x, y: bl.y + xs.webHeight },
        bl,
        lfl,
        { x: bl.x + xs.bracketLength, y: lfl.y + lGradient * (xs.bracketLength - (lfl.x - bl.x)) },
        { x: bl.x + xs.bracketLength, y: bl.y + xs.webHeight + uGradient * xs.bracketLength },
    ];
    let lstiffPoint = [
        tl,
        { x: bl.x, y: bl.y + xs.webHeight + xs.flangeThickness },
        { x: bl.x + xs.stiffWidth2, y: bl.y + xs.webHeight + xs.flangeThickness + uGradient * xs.stiffWidth2 },
        { x: bl.x + xs.stiffWidth2, y: bl.y + xs.webHeight + xs.flangeThickness + uGradient * xs.stiffWidth2 + 50 },
        { x: bl.x + xs.stiffWidth, y: bl.y + xs.webHeight + xs.flangeThickness + uGradient * xs.stiffWidth2 + (xs.stiffWidth2 - xs.stiffWidth) + 50 },
        { x: tl.x + xs.stiffWidth, y: tl.y + tGradient * xs.stiffWidth },
    ];
    let lstiff = [];
    lstiff.push(...scallop(lstiffPoint[5], lstiffPoint[0], lstiffPoint[1], xs.scallopRadius, 4));
    lstiff.push(...scallop(lstiffPoint[0], lstiffPoint[1], lstiffPoint[2], xs.scallopRadius, 4));
    lstiff.push(lstiffPoint[2], lstiffPoint[3]);
    lstiff.push(...GetFilletPoints2D(lstiffPoint[3], lstiffPoint[4], lstiffPoint[5], xs.stiffFilletR, 4));
    lstiff.push(lstiffPoint[5]);

    let rwebPlate = [
        { x: br.x, y: br.y + xs.webHeight },
        br,
        lfr,
        { x: br.x - xs.bracketLength, y: lfr.y - lGradient * (xs.bracketLength - (br.x - lfr.x)) },
        { x: br.x - xs.bracketLength, y: br.y + xs.webHeight - uGradient * xs.bracketLength },
    ];
    // result["webBracket1"] = vPlateGen(rwebPlate, centerPoint, xbeamSection.webThickness, [], 0, null, null, [], [0, 3], null, [2, 3]);
    let rstiffPoint = [
        tr,
        { x: br.x, y: br.y + xs.webHeight + xs.flangeThickness },
        { x: br.x - xs.stiffWidth2, y: br.y + xs.webHeight + xs.flangeThickness - uGradient * xs.stiffWidth2 },
        { x: br.x - xs.stiffWidth2, y: br.y + xs.webHeight + xs.flangeThickness - uGradient * xs.stiffWidth2 + 50 },
        { x: br.x - xs.stiffWidth, y: br.y + xs.webHeight + xs.flangeThickness - uGradient * xs.stiffWidth2 + (xs.stiffWidth2 - xs.stiffWidth) + 50 },
        { x: tr.x - xs.stiffWidth, y: tr.y - tGradient * xs.stiffWidth },
    ];
    let rstiff = [];
    rstiff.push(...scallop(rstiffPoint[5], rstiffPoint[0], rstiffPoint[1], xs.scallopRadius, 4));
    rstiff.push(...scallop(rstiffPoint[0], rstiffPoint[1], rstiffPoint[2], xs.scallopRadius, 4));
    rstiff.push(rstiffPoint[2], rstiffPoint[3]);
    rstiff.push(...GetFilletPoints2D(rstiffPoint[3], rstiffPoint[4], rstiffPoint[5], xs.stiffFilletR, 4));
    rstiff.push(rstiffPoint[5]);
    // result["stiffner1"] = vPlateGen(rstiff, centerPoint, xbeamSection.stiffThickness, [], 0, null, null, []);

    let webBracketModel0 = vPlateGenV2(lwebPlate, vcenterPoint, [], 0, null, null);
    let webBracketModel1 = vPlateGenV2(rwebPlate, vcenterPoint, [], 0, null, null);
    let stiffnerModel0 = vPlateGenV2(lstiff, vcenterPoint, [], 0, null, null);
    let stiffnerModel1 = vPlateGenV2(rstiff, vcenterPoint, [], 0, null, null);
    result["children"].push(
        new Extrude(webBracketModel0, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webBracket0",
        }),
        new Extrude(webBracketModel1, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webBracket1",
        }),
        new Extrude(stiffnerModel0, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner0",
        }),
        new Extrude(stiffnerModel1, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner1",
        }),
    );

    let bracketPoint = [lwebPlate[0], rwebPlate[0], lfl, lfr];
    let bracketModel = [];
    let skewSin = (Math.sin(centerPoint.skew) * xs.flangeWidth) / 2;
    for (let i = 0; i < 4; i++) {
        let sign = i % 2 === 0 ? 1 : -1;
        let grad = i < 2 ? uRad : lRad;
        let z = i < 2 ? 0 : -xs.flangeThickness;
        let thickness = i < 2 ? xs.flangeThickness : -xs.flangeThickness;
        let bracketLength = i < 2 ? xs.bracketLength : i === 2 ? xs.bracketLength - (ufl.x - tl.x) : xs.bracketLength - (tr.x - ufr.x);
        let lowerbracket1 = [
            { x: 0, y: xs.bracketWidth / 2 },
            { x: sign * 20, y: xs.bracketWidth / 2 },
            { x: sign * 20, y: xs.flangeWidth / 2 },
            { x: sign * bracketLength - skewSin, y: xs.flangeWidth / 2 },
            { x: sign * bracketLength + skewSin, y: -xs.flangeWidth / 2 },
            { x: sign * 20, y: -xs.flangeWidth / 2 },
            { x: sign * 20, y: -xs.bracketWidth / 2 },
            { x: 0, y: -xs.bracketWidth / 2 },
        ];
        lowerbracket1 = lowerbracket1.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
        let bracketShape = [
            lowerbracket1[0],
            lowerbracket1[1],
            ...GetFilletPoints2D(lowerbracket1[1], lowerbracket1[2], lowerbracket1[3], xs.bracketFilletR, 4),
            lowerbracket1[3],
            lowerbracket1[4],
            ...GetFilletPoints2D(lowerbracket1[4], lowerbracket1[5], lowerbracket1[6], xs.bracketFilletR, 4),
            lowerbracket1[6],
            lowerbracket1[7],
        ];
        let cp = {...(new RefPoint(PointToSkewedGlobal(bracketPoint[i], centerPoint), centerPoint.xAxis, 0)), yRotation : grad};
        result["children"].push(
            new Extrude(bracketShape, xs.flangeThickness, { refPoint: cp, dz : z}, "steelBox", {
                group: group,
                part: gridkey,
                key: "bracket" + i.toFixed(0),
            })
        );
    }
    let webPlate = [lwebPlate[3], rwebPlate[3], rwebPlate[4], lwebPlate[4]];
    let mainPlatePts = vPlateGenV2(webPlate, vcenterPoint,[], 0, null, null);
    result["children"].push(
        new Extrude(mainPlatePts, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webPlate",

        })
    );
    let uPoint = {...(new RefPoint(PointToSkewedGlobal(lwebPlate[4], centerPoint), centerPoint.xAxis, 0)), yRotation : lRad}
    // let uPoint = PointToSkewedGlobal(centerPoint, lwebPlate[4]);
    let l = Math.sqrt((lwebPlate[4].x - rwebPlate[4].x) ** 2 + (lwebPlate[4].y - rwebPlate[4].y) ** 2);
    let uflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: l + skewSin, y: -xs.flangeWidth / 2 },
        { x: l - skewSin, y: xs.flangeWidth / 2 },
    ];
    uflangePlate = uflangePlate.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
    result["children"].push(
        new Extrude(uflangePlate, xs.flangeThickness, { refPoint: uPoint, dz : 0}, "steelBox", {
            group: group,
            part: gridkey,
            key: "upperflange",
        })
    );
    let lPoint = {...(new RefPoint(PointToSkewedGlobal(lwebPlate[3], centerPoint), centerPoint.xAxis, 0)), yRotation : lRad}
    let ll = Math.sqrt((lwebPlate[3].x - rwebPlate[3].x) ** 2 + (lwebPlate[3].y - rwebPlate[3].y) ** 2);
    let lflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: ll + skewSin, y: -xs.flangeWidth / 2 },
        { x: ll - skewSin, y: xs.flangeWidth / 2 },
    ];
    lflangePlate = lflangePlate.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
    result["children"].push(
        new Extrude(lflangePlate, xs.flangeThickness, { refPoint: lPoint, dz : -xs.flangeThickness}, "steelBox", {
            group: group,
            part: gridkey,
            key: "lowerflange",
        })
    );
    let joint = IbeamJointV2(webPlate, centerPoint, xs, wBolt, fBolt);
    for (let i in joint) {
        joint[i]["meta"] = { ...joint[i]["meta"], group : group, part: gridkey, key: i }
        result["children"].push(joint[i]);
    }
    return result;
}

export function DYXbeam2V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xs, iNodekey, jNodekey, xbeamSectionName) {
    // let xs = {
    //   "bracketLength": 420,
    //   "bracketWidth": 550,
    //   "bracketFilletR": 150,
    //   "webHeight": 878,
    //   "webThickness": 12,
    //   "flangeWidth": 250,
    //   "flangeThickness": 12,
    //   "stiffThickness": 12,
    //   "stiffWidth": 100,
    //   "scallopRadius": 25,
    //   "webJointThickness": 10,
    //   "webJointWidth": 330,
    //   "webJointHeight": 780,
    //   "flangeJointThickness": 10,
    //   "flangeJointLength": 480,
    //   "flangeJointWidth": 80
    // }
    let wBolt = {
        P: 100,
        G: 75,
        pNum: 8,
        gNum: 2,
        size: 37,
        dia: 22,
        t: 14,
    };
    let fBolt = {
        P: 170,
        G: 75,
        pNum: 2,
        gNum: 3,
        size: 37,
        dia: 22,
        t: 14,
    };
    const group = "CrossBeam";

    let tlength = Math.sqrt((iPoint.x - jPoint.x) ** 2 + (iPoint.y - jPoint.y) ** 2);
    let vec = { x: (jPoint.x - iPoint.x) / tlength, y: (jPoint.y - iPoint.y) / tlength };
    let dOffset = (jPoint.offset - iPoint.offset) / 2;
    let dz = (jPoint.z - iPoint.z) / 2;
    let cw = iPoint.normalCos * vec.y - iPoint.normalSin * vec.x > 0 ? 1 : -1; // 반시계방향의 경우 1
    let dotVec = (iPoint.normalCos * vec.x + iPoint.normalSin * vec.y).toFixed(4) * 1;

    let vcenterPoint = 
    {   ...iPoint,
        ...(new RefPoint(new Point((iPoint.x + jPoint.x) / 2, (iPoint.y + jPoint.y) / 2, (iPoint.z + jPoint.z) / 2,), new Point(vec.x, vec.y), Math.PI/2)),
        offset : (iPoint.offset + jPoint.offset) / 2,
        skew : cw * Math.acos(dotVec)
    }
    let rad = cw * Math.acos(dotVec);
    let tan = Math.tan(rad);

    let centerPoint = 
    {   ...iPoint,
        ...(new RefPoint(new Point((iPoint.x + jPoint.x) / 2, (iPoint.y + jPoint.y) / 2, (iPoint.z + jPoint.z) / 2,), iPoint.xAxis, Math.PI/2)),
        offset : (iPoint.offset + jPoint.offset) / 2,
        skew : cw * Math.acos(dotVec)
    }

    // const rotationY = (centerPoint.skew - 90) * Math.PI / 180
    const rightAngle = Math.PI / 2;

    //폐합시를 고려하여 예외처리 필요
    let ufl, ufr;
    if (iSectionPoint.uflange[2].length > 0) {
        ufl = { x: iSectionPoint.uflange[2][1].x - dOffset, y: iSectionPoint.uflange[2][1].y - dz };
    } else {
        ufl = { x: iSectionPoint.uflange[1][0].x - dOffset, y: iSectionPoint.uflange[1][0].y - dz };
    }
    if (jSectionPoint.uflange[2].length > 0) {
        ufr = { x: jSectionPoint.uflange[2][0].x + dOffset, y: jSectionPoint.uflange[2][0].y + dz };
    } else {
        ufr = { x: jSectionPoint.uflange[0][0].x + dOffset, y: jSectionPoint.uflange[0][0].y + dz };
    }
    // let lfl = { x: iSectionPoint.lflange[1][0].x - dOffset, y: iSectionPoint.lflange[1][0].y - dz };
    // let lfr = { x: jSectionPoint.lflange[0][0].x + dOffset, y: jSectionPoint.lflange[0][0].y + dz };

    let tl = { x: iSectionPoint.web[1][2].x - dOffset, y: iSectionPoint.web[1][2].y - dz };
    let tr = { x: jSectionPoint.web[0][2].x + dOffset, y: jSectionPoint.web[0][2].y + dz };
    let bl = { x: iSectionPoint.web[1][3].x - dOffset, y: iSectionPoint.web[1][3].y - dz };
    let br = { x: jSectionPoint.web[0][3].x + dOffset, y: jSectionPoint.web[0][3].y + dz };

    let result = { parent: [], children: [] };
    let gridkey = iNodekey + jNodekey;

    // result["id"] = tl.x.toFixed(0) + tl.y.toFixed(0) + tr.x.toFixed(0) + tr.y.toFixed(0) + bl.x.toFixed(0) + bl.y.toFixed(0) + br.x.toFixed(0) + br.y.toFixed(0)
    // result["point"] = centerPoint

    let uGradient = (ufr.y - ufl.y) / (ufr.x - ufl.x);
    let lGradient = (tr.y - tl.y) / (tr.x - tl.x);
    let uRad = -Math.atan(uGradient);
    let lRad = -Math.atan(lGradient);

    let lwebPlate = [
        tl,
        { x: tl.x, y: tl.y - xs.webHeight },
        { x: tl.x + xs.bracketLength, y: tl.y - xs.webHeight + lGradient * xs.bracketLength },
        { x: tl.x + xs.bracketLength, y: ufl.y + uGradient * (xs.bracketLength - (ufl.x - tl.x)) },
        ufl,
    ];
    // result["webBracket0"] = vPlateGenV2(lwebPlate, centerPoint, xs.webThickness, [], 0, null, null, [], [0, 3], null, [1, 2]);
    let webBracketModel0 = vPlateGenV2(lwebPlate, vcenterPoint, [], 0, null, null);

    let lstiff = [
        { x: tl.x, y: tl.y - xs.webHeight - xs.flangeThickness },
        bl,
        { x: bl.x + xs.stiffWidth, y: bl.y },
        { x: tl.x + xs.bracketLength, y: tl.y - xs.webHeight - xs.flangeThickness + lGradient * xs.bracketLength - 30 },
        { x: tl.x + xs.bracketLength, y: tl.y - xs.webHeight - xs.flangeThickness + lGradient * xs.bracketLength },
    ];
    let stiffnerModel0 = vPlateGenV2(lstiff, vcenterPoint, [0, 1], xs.scallopRadius, null, null);
    result["children"].push(
        new Extrude(webBracketModel0, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webBracket0",
        }),
        new Extrude(stiffnerModel0, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner0",
        }),
    );
    let lL = Math.sqrt((lstiff[2].x - lstiff[3].x) ** 2 + (lstiff[2].y - lstiff[3].y) ** 2);
    let lrot = -Math.atan(((lstiff[2].y - lstiff[3].y) / (lstiff[2].x - lstiff[3].x)) * Math.cos(rad));
    let lPlate = [
        { x: -lL / 2 + 30, y: 30 },
        { x: -lL / 2 + 120, y: 60 },
        { x: lL / 2 - 120, y: 60 },
        { x: lL / 2 - 30, y: 30 },
        { x: lL / 2 - 30, y: -30 },
        { x: lL / 2 - 120, y: -60 },
        { x: -lL / 2 + 120, y: -60 },
        { x: -lL / 2 + 30, y: -30 },
    ];
    let cp = { x: (lstiff[2].x + lstiff[3].x) / 2, y: (lstiff[2].y + lstiff[3].y) / 2 };
    let leftCp = {...(new RefPoint(PointToSkewedGlobal(cp, centerPoint), new Point(vec.x, vec.y), 0)), yRotation : lrot};
    let stiffStiffThickness = 12; //수직보강재의 보강재두께
    result["children"].push(
        new Extrude(lPlate, stiffStiffThickness, { refPoint: leftCp, dz : -stiffStiffThickness}, "steelBox", {
            group: group,
            part: gridkey,
            key: "lstiffPlate",
        })
    );
    let rwebPlate = [
        tr,
        { x: tr.x, y: tr.y - xs.webHeight },
        { x: tr.x - xs.bracketLength, y: tr.y - xs.webHeight - lGradient * xs.bracketLength },
        { x: tr.x - xs.bracketLength, y: ufr.y - uGradient * (xs.bracketLength - (tr.x - ufr.x)) },
        ufr,
    ];
    // result["webBracket1"] = vPlateGenV2(rwebPlate, centerPoint, xs.webThickness, [], 0, null, null, [], [0, 3], null, [1, 2]);
    let webBracketModel1 = vPlateGenV2(rwebPlate, vcenterPoint, [], 0, null, null);
    let rstiff = [
        { x: tr.x, y: tr.y - xs.webHeight - xs.flangeThickness },
        br,
        { x: br.x - xs.stiffWidth, y: br.y },
        { x: tr.x - xs.bracketLength, y: tr.y - xs.webHeight - xs.flangeThickness - lGradient * xs.bracketLength - 30 },
        { x: tr.x - xs.bracketLength, y: tr.y - xs.webHeight - xs.flangeThickness - lGradient * xs.bracketLength },
    ];
    PlateRestPoint({ x: tr.x, y: tr.y - xs.webHeight - xs.flangeThickness }, br, lGradient, 0, -xs.stiffWidth);
    // result["stiffner1"] = vPlateGenV2(rstiff, centerPoint, xs.stiffThickness, [0, 1], xs.scallopRadius, null, null, []);
    let stiffnerModel1 = vPlateGenV2(rstiff, vcenterPoint, [0, 1], xs.scallopRadius, null, null);
    result["children"].push(
        new Extrude(webBracketModel1, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webBracket1",
        }),
        new Extrude(stiffnerModel1, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner1",
        }),
    );
    let rL = Math.sqrt((rstiff[2].x - rstiff[3].x) ** 2 + (rstiff[2].y - rstiff[3].y) ** 2);
    let rrot = -Math.atan(((rstiff[2].y - rstiff[3].y) / (rstiff[2].x - rstiff[3].x)) * Math.cos(rad));
    let rPlate = [
        { x: -rL / 2 + 30, y: 30 },
        { x: -rL / 2 + 120, y: 60 },
        { x: rL / 2 - 120, y: 60 },
        { x: rL / 2 - 30, y: 30 },
        { x: rL / 2 - 30, y: -30 },
        { x: rL / 2 - 120, y: -60 },
        { x: -rL / 2 + 120, y: -60 },
        { x: -rL / 2 + 30, y: -30 },
    ];
    let rcp = { x: (rstiff[2].x + rstiff[3].x) / 2, y: (rstiff[2].y + rstiff[3].y) / 2 };
    let rightCp = {...(new RefPoint(PointToSkewedGlobal(rcp, centerPoint), new Point(vec.x, vec.y), 0)), yRotation : rrot};
    result["children"].push(
        new Extrude(rPlate, stiffStiffThickness, { refPoint: rightCp, dz : -stiffStiffThickness}, "steelBox", {
            group: group,
            part: gridkey,
            key: "rstiffPlate",
        })
    );

    let bracketPoint = [lstiff[0], rstiff[0], ufl, ufr];
    let bracketModel = [];
    let skewSin = (Math.sin(centerPoint.skew) * xs.flangeWidth) / 2;
    for (let i = 0; i < 4; i++) {
        let sign = i % 2 === 0 ? 1 : -1;
        let grad = i < 2 ? lRad : uRad;
        let bracketLength = i < 2 ? xs.bracketLength : i === 2 ? xs.bracketLength - (ufl.x - tl.x) : xs.bracketLength - (tr.x - ufr.x);
        let lowerbracket1 = [
            { x: 0, y: xs.bracketWidth / 2 },
            { x: sign * 15, y: xs.bracketWidth / 2 },
            { x: sign * 44, y: xs.bracketWidth / 2 - 82 },
            { x: sign * bracketLength - skewSin, y: xs.flangeWidth / 2 },
            { x: sign * bracketLength + skewSin, y: -xs.flangeWidth / 2 },
            { x: sign * 44, y: -xs.bracketWidth / 2 + 82 },
            { x: sign * 15, y: -xs.bracketWidth / 2 },
            { x: 0, y: -xs.bracketWidth / 2 },
        ];
        lowerbracket1 = lowerbracket1.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
        let bracketShape = [
            lowerbracket1[0],
            lowerbracket1[1],
            ...GetFilletPoints2D(lowerbracket1[1], lowerbracket1[2], lowerbracket1[3], xs.bracketFilletR, 4),
            lowerbracket1[3],
            lowerbracket1[4],
            ...GetFilletPoints2D(lowerbracket1[4], lowerbracket1[5], lowerbracket1[6], xs.bracketFilletR, 4),
            lowerbracket1[6],
            lowerbracket1[7],
        ];
        let z = 0;
        let cp = {...(new RefPoint(PointToSkewedGlobal(bracketPoint[i], centerPoint), centerPoint.xAxis, 0)), yRotation : grad};
        result["children"].push(
            new Extrude(bracketShape, xs.flangeThickness, { refPoint: cp, dz : z}, "steelBox", {
                group: group,
                part: gridkey,
                key: "bracket" + i.toFixed(0),
            })
        );
    }
    let webPlate = [lwebPlate[2], rwebPlate[2], rwebPlate[3], lwebPlate[3]];
    let mainPlatePts = vPlateGenV2(webPlate, vcenterPoint,[], 0, null, null);
    result["children"].push(
        new Extrude(mainPlatePts, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webPlate",

        })
    );
    let uPoint = {...(new RefPoint(PointToSkewedGlobal(lwebPlate[3], centerPoint), centerPoint.xAxis, 0)), yRotation : uRad}
    // let uPoint = PointToSkewedGlobal(centerPoint, lwebPlate[3]); //가로보 중심축을 기준으로 해야 측면도상의 중심단면이 반영됨. 추후 수정 필요
    let l = Math.sqrt((lwebPlate[3].x - rwebPlate[3].x) ** 2 + (lwebPlate[3].y - rwebPlate[3].y) ** 2);
    let uflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: l + skewSin, y: -xs.flangeWidth / 2 },
        { x: l - skewSin, y: xs.flangeWidth / 2 },
    ];
    uflangePlate = uflangePlate.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
    result["children"].push(
        new Extrude(uflangePlate, xs.flangeThickness, { refPoint: uPoint, dz : 0}, "steelBox", {
            group: group,
            part: gridkey,
            key: "upperflange",
        })
    );
    let lPoint = {...(new RefPoint(PointToSkewedGlobal(lwebPlate[2], centerPoint), centerPoint.xAxis, 0)), yRotation : lRad}
    let ll = Math.sqrt((lwebPlate[2].x - rwebPlate[2].x) ** 2 + (lwebPlate[2].y - rwebPlate[2].y) ** 2);
    let lflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: ll + skewSin, y: -xs.flangeWidth / 2 },
        { x: ll - skewSin, y: xs.flangeWidth / 2 },
    ];
    lflangePlate = lflangePlate.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
    result["children"].push(
        new Extrude(lflangePlate, xs.flangeThickness, { refPoint: lPoint, dz : -xs.flangeThickness}, "steelBox", {
            group: group,
            part: gridkey,
            key: "lowerflange",
        })
    );
    let joint = IbeamJointV2(webPlate, centerPoint, xs, wBolt, fBolt);
    for (let i in joint) {
        joint[i]["meta"] = { ...joint[i]["meta"], group : group, part: gridkey, key: i }
        result["children"].push(joint[i]);
    }
    return result;
}

export function DYXbeam1V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xs, iNodekey, jNodekey, xbeamSectionName) {
    // let xbeamSection = {
    //   "bracketLength": 641,
    //   "bracketWidth": 450,
    //   "bracketFilletR": 100,
    //   "webHeight": 578,
    //   "webThickness": 12,
    //   "flangeWidth": 250,
    //   "flangeThickness": 12,
    //   "stiffThickness": 12,
    //   "stiffWidth": 150,
    //   "scallopRadius": 25,
    //   "webJointThickness": 10,
    //   "webJointWidth": 330,
    //   "webJointHeight": 440,
    //   "flangeJointThickness": 10,
    //   "flangeJointLength": 480,
    //   "flangeJointWidth": 80
    // }
    let wBolt = {
        P: 90,
        G: 75,
        pNum: 5,
        gNum: 2,
        size: 37,
        dia: 22,
        t: 14,
    };
    let fBolt = {
        P: 170,
        G: 75,
        pNum: 2,
        gNum: 3,
        size: 37,
        dia: 22,
        t: 14,
    };
    const group = "CrossBeam";

    let tlength = Math.sqrt((iPoint.x - jPoint.x) ** 2 + (iPoint.y - jPoint.y) ** 2);
    let vec = { x: (jPoint.x - iPoint.x) / tlength, y: (jPoint.y - iPoint.y) / tlength };
    let dOffset = (jPoint.offset - iPoint.offset) / 2;
    let dz = (jPoint.z - iPoint.z) / 2;
    let cw = iPoint.normalCos * vec.y - iPoint.normalSin * vec.x > 0 ? 1 : -1; // 반시계방향의 경우 1
    let dotVec = (iPoint.normalCos * vec.x + iPoint.normalSin * vec.y).toFixed(4) * 1;

    let centerPoint = 
    {   ...iPoint,
        ...(new RefPoint(new Point((iPoint.x + jPoint.x) / 2, (iPoint.y + jPoint.y) / 2, (iPoint.z + jPoint.z) / 2,), iPoint.xAxis, Math.PI/2)),
        offset : (iPoint.offset + jPoint.offset) / 2,
        skew : cw * Math.acos(dotVec)
    }
    let vcenterPoint = 
    {   ...iPoint,
        ...(new RefPoint(new Point((iPoint.x + jPoint.x) / 2, (iPoint.y + jPoint.y) / 2, (iPoint.z + jPoint.z) / 2,), new Point(vec.x, vec.y), Math.PI/2)),
        offset : (iPoint.offset + jPoint.offset) / 2,
        skew : cw * Math.acos(dotVec)
    }
    let rad = cw * Math.acos(dotVec);
    let tan = Math.tan(rad);

    const rightAngle = Math.PI / 2;
    let cw2 = jPoint.normalCos * vec.y - jPoint.normalSin * vec.x > 0 ? 1 : -1; // 반시계방향의 경우 1
    let iPointSkew = cw * Math.acos(iPoint.normalCos * vec.x + iPoint.normalSin * vec.y);
    let jPointSkew = cw2 * Math.acos(jPoint.normalCos * vec.x + jPoint.normalSin * vec.y);

    let iSkewRad = iPointSkew;
    let jSkewRad = jPointSkew;

    let newIpoint = {
        x: iPoint.x,
        y: iPoint.y,
        z: iPoint.z,
        normalCos: iPoint.normalCos,
        normalSin: iPoint.normalSin,
        skew: iPointSkew,
        offset: iPoint.offset,
    };
    let newJpoint = {
        x: jPoint.x,
        y: jPoint.y,
        z: jPoint.z,
        normalCos: jPoint.normalCos,
        normalSin: jPoint.normalSin,
        skew: jPointSkew,
        offset: jPoint.offset,
    };

    let ufl, ufr, ufl2, ufr2;
    if (iSectionPoint.uflange[2].length > 0) {
        ufl = { x: iSectionPoint.uflange[2][1].x - dOffset, y: iSectionPoint.uflange[2][1].y - dz };
        ufl2 = iSectionPoint.uflange[2][1];
    } else {
        ufl = { x: iSectionPoint.uflange[1][0].x - dOffset, y: iSectionPoint.uflange[1][0].y - dz };
        ufl2 = iSectionPoint.uflange[1][0];
    }
    if (jSectionPoint.uflange[2].length > 0) {
        ufr = { x: jSectionPoint.uflange[2][0].x + dOffset, y: jSectionPoint.uflange[2][0].y + dz };
        ufr2 = jSectionPoint.uflange[2][0];
    } else {
        ufr = { x: jSectionPoint.uflange[0][0].x + dOffset, y: jSectionPoint.uflange[0][0].y + dz };
        ufr2 = jSectionPoint.uflange[0][0];
    }

    let tl = { x: iSectionPoint.web[1][2].x - dOffset, y: iSectionPoint.web[1][2].y - dz };
    let tr = { x: jSectionPoint.web[0][2].x + dOffset, y: jSectionPoint.web[0][2].y + dz };
    let bl = { x: iSectionPoint.web[1][3].x - dOffset, y: iSectionPoint.web[1][3].y - dz };
    let br = { x: jSectionPoint.web[0][3].x + dOffset, y: jSectionPoint.web[0][3].y + dz };

    let result = { parent: [], children: [] };
    let gridkey = iNodekey + jNodekey;

    let tl2 = iSectionPoint.web[1][2];
    let tr2 = jSectionPoint.web[0][2];

    let ciPoint = PointToSkewedGlobal(newIpoint, tl2);
    let cjPoint = PointToSkewedGlobal(newJpoint, tr2);
    let tLength2 = Math.sqrt((ciPoint.x - cjPoint.x) ** 2 + (ciPoint.y - cjPoint.y) ** 2);
    let uGradient = (ufr.y - ufl.y) / (ufr.x - ufl.x);
    let lGradient = (tr.y - tl.y) / (tr.x - tl.x);
    let uRad = -Math.atan(uGradient);
    let lRad = -Math.atan(lGradient);

    let lwebPlate = [
        tl,
        { x: tl.x, y: tl.y - xs.webHeight },
        { x: tl.x + xs.bracketLength, y: tl.y - xs.webHeight + lGradient * xs.bracketLength },
        { x: tl.x + xs.bracketLength, y: ufl.y + uGradient * (xs.bracketLength - (ufl.x - tl.x)) },
        ufl,
    ];
    let rwebPlate = [
        tr,
        { x: tr.x, y: tr.y - xs.webHeight },
        { x: tr.x - xs.bracketLength, y: tr.y - xs.webHeight - lGradient * xs.bracketLength },
        { x: tr.x - xs.bracketLength, y: ufr.y - uGradient * (xs.bracketLength - (tr.x - ufr.x)) },
        ufr,
    ];
    let lstiff = PlateRestPoint(
        { x: tl.x, y: tl.y - xs.webHeight - xs.flangeThickness },
        bl,
        lGradient,
        0,
        xs.stiffWidth
    );
    let rstiff = PlateRestPoint(
        { x: tr.x, y: tr.y - xs.webHeight - xs.flangeThickness },
        br,
        lGradient,
        0,
        -xs.stiffWidth
    );

    let webBracketModel0 = vPlateGenV2(lwebPlate, vcenterPoint, [], 0, null, null);
    let webBracketModel1 = vPlateGenV2(rwebPlate, vcenterPoint, [], 0, null, null);
    let stiffnerModel0 = vPlateGenV2(lstiff, vcenterPoint, [0, 1], xs.scallopRadius, null, null);
    let stiffnerModel1 = vPlateGenV2(rstiff, vcenterPoint, [0, 1], xs.scallopRadius, null, null);

    result["children"].push(
        new Extrude(webBracketModel0, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webBracket0",
        }),
        new Extrude(webBracketModel1, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webBracket1",
        }),
        new Extrude(stiffnerModel0, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner0",
        }),
        new Extrude(stiffnerModel1, xs.stiffThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "stiffner1",
        }),
    );

    let bracketPoint = [lstiff[0], rstiff[0], ufl, ufr];
    let skewSin = (Math.sin(centerPoint.skew) * xs.flangeWidth) / 2;

    if (iSectionPoint.uflange[1].length > 0 && jSectionPoint.uflange[0].length > 0) {
        for (let i = 0; i < 4; i++) {
            // let skew = i % 2 === 0 ? iPointSkew : jPointSkew;
            let sign = i % 2 === 0 ? 1 : -1;
            let grad = i < 2 ? lRad : uRad;
            let bracketLength =
                i < 2
                    ? xs.bracketLength
                    : i === 2
                    ? xs.bracketLength - (ufl2.x - tl2.x) / Math.cos(iSkewRad)
                    : xs.bracketLength - (tr2.x - ufr2.x) / Math.cos(jSkewRad);
            let lowerbracket1 = [
                { x: 0, y: xs.bracketWidth / 2 },
                { x: sign * 20, y: xs.bracketWidth / 2 },
                { x: sign * 20, y: xs.flangeWidth / 2 },
                { x: sign * bracketLength - skewSin, y: xs.flangeWidth / 2 },
                { x: sign * bracketLength + skewSin, y: -xs.flangeWidth / 2 },
                { x: sign * 20, y: -xs.flangeWidth / 2 },
                { x: sign * 20, y: -xs.bracketWidth / 2 },
                { x: 0, y: -xs.bracketWidth / 2 },
            ];
            lowerbracket1 = lowerbracket1.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
            let bracketShape = [
                lowerbracket1[0],
                lowerbracket1[1],
                ...GetFilletPoints2D(lowerbracket1[1], lowerbracket1[2], lowerbracket1[3], xs.bracketFilletR, 4),
                lowerbracket1[3],
                lowerbracket1[4],
                ...GetFilletPoints2D(lowerbracket1[4], lowerbracket1[5], lowerbracket1[6], xs.bracketFilletR, 4),
                lowerbracket1[6],
                lowerbracket1[7],
            ];
            let z = 0;
            let cp = {...(new RefPoint(PointToSkewedGlobal(bracketPoint[i], centerPoint), centerPoint.xAxis, 0)), yRotation : grad};
            result["children"].push(
                new Extrude(bracketShape, xs.flangeThickness, { refPoint: cp, dz : z}, "steelBox", {
                    group: group,
                    part: gridkey,
                    key: "bracket" + i.toFixed(0),
                })
            );
        }
    }
    let webPlate = [lwebPlate[2], rwebPlate[2], rwebPlate[3], lwebPlate[3]];
    let mainPlatePts = vPlateGenV2(webPlate, vcenterPoint,[], 0, null, null);
    result["children"].push(
        new Extrude(mainPlatePts, xs.webThickness, { refPoint: vcenterPoint }, "steelBox", {
            group: group,
            part: gridkey,
            key: "webPlate",

        })
    );

    let uPoint = {...(new RefPoint(PointToSkewedGlobal({
        x: tl2.x + xs.bracketLength * Math.cos(iSkewRad),
        y: ufl2.y + uGradient * (xs.bracketLength - (ufl2.x - tl2.x)) * Math.cos(iSkewRad),
    }, centerPoint), centerPoint.xAxis, 0)), yRotation : uRad}

    // let uPoint = PointToSkewedGlobal(newIpoint, {
    //     x: tl2.x + xs.bracketLength * Math.cos(iSkewRad),
    //     y: ufl2.y + uGradient * (xs.bracketLength - (ufl2.x - tl2.x)) * Math.cos(iSkewRad),
    // });
    let l = (tLength2 - xs.bracketLength - xs.bracketLength) / Math.cos(uRad); // Math.sqrt((lwebPlate[3].x - rwebPlate[3].x) ** 2 + (lwebPlate[3].y - rwebPlate[3].y) ** 2)
    let uflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: l + skewSin, y: -xs.flangeWidth / 2 },
        { x: l - skewSin, y: xs.flangeWidth / 2 },
    ];
    uflangePlate = uflangePlate.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
    result["children"].push(
        new Extrude(uflangePlate, xs.flangeThickness, { refPoint: uPoint, dz : 0}, "steelBox", {
            group: group,
            part: gridkey,
            key: "upperflange",
        })
    );
    let lPoint = {...(new RefPoint(PointToSkewedGlobal(lwebPlate[2], centerPoint), centerPoint.xAxis, 0)), yRotation : lRad}
    let ll = Math.sqrt((lwebPlate[2].x - rwebPlate[2].x) ** 2 + (lwebPlate[2].y - rwebPlate[2].y) ** 2);
    let lflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: ll + skewSin, y: -xs.flangeWidth / 2 },
        { x: ll - skewSin, y: xs.flangeWidth / 2 },
    ];
    lflangePlate = lflangePlate.map(pt=>new Point(pt.x, pt.y + tan*pt.x))
    result["children"].push(
        new Extrude(lflangePlate, xs.flangeThickness, { refPoint: lPoint, dz : -xs.flangeThickness}, "steelBox", {
            group: group,
            part: gridkey,
            key: "lowerflange",
        })
    );
    let joint = IbeamJointV2(webPlate, centerPoint, xs, wBolt, fBolt);
    for (let i in joint) {
        joint[i]["meta"] = { ...joint[i]["meta"], group : group, part: gridkey, key: i }
        result["children"].push(joint[i]);
    }
    return result;
}


export function IbeamJointV2(webPoints, centerPoint, xs, wBolt, fBolt) {
    // webPoint는 반드시 좌측하단을 시작으로 시계반대방향순이어야함
    // let xs = {
    //   webThickness: 12,
    //   flangeWidth: 250,
    //   flangeThickness: 12,
    //   webJointThickness: 10,
    //   webJointWidth: 330,
    //   webJointHeight: 440,
    //   flangeJointThickness: 10,
    //   flangeJointLength: 480,
    //   flangeJointWidth: 80,
    // }
    // let wBolt = {
    //   P:90,
    //   G:75,
    //   pNum:5,
    //   gNum:2,
    //   size:37,
    //   t:14,
    // }
    // let fBolt = {
    //   P:170,
    //   G:75,
    //   pNum:2,
    //   gNum:3,
    //   size:37,
    //   t:14,
    // }
    let result = {};
    let plateMaterial = "steelBox";
    let boltMaterial = "stud";
    const rotationY = centerPoint.skew
    let uGradient = (webPoints[3].y - webPoints[2].y) / (webPoints[3].x - webPoints[2].x);
    let lGradient = (webPoints[1].y - webPoints[0].y) / (webPoints[1].x - webPoints[0].x);
    let uRad = -Math.atan(uGradient)
    let lRad = -Math.atan(lGradient)
    let ref = toRefPoint(centerPoint, true)
  
    /////////////////////////////////// to the Joint function //////////////////////////////////////////
    let origin1 = { x: (webPoints[0].x + webPoints[3].x) / 2, y: (webPoints[0].y + webPoints[3].y) / 2 };
    let origin2 = { x: (webPoints[1].x + webPoints[2].x) / 2, y: (webPoints[1].y + webPoints[2].y) / 2 };
    let webPoint1 = new RefPoint(PointToSkewedGlobal(origin1, centerPoint), ref.xAxis, Math.PI/2);
    let webPoint2 = new RefPoint(PointToSkewedGlobal(origin2, centerPoint), ref.xAxis, Math.PI/2);

    let webJoint1 = [{ x: - xs.webJointWidth / 2, y: - xs.webJointHeight / 2 },
    { x: xs.webJointWidth / 2, y: - xs.webJointHeight / 2 },
    { x: xs.webJointWidth / 2, y: xs.webJointHeight / 2 },
    { x: - xs.webJointWidth / 2, y: xs.webJointHeight / 2 }];
    
    let WebBolt = {
      P: wBolt.P, G: wBolt.G, size: wBolt.size, dia: wBolt.dia, t: wBolt.t, l: xs.webJointThickness * 2 + xs.webThickness,
      layout: BoltLayout(wBolt.G, wBolt.P, "Y", webJoint1), isUpper: true
    };
    result["webJoint1"] = new Extrude(
        webJoint1, xs.webJointThickness,
        {refPoint : webPoint1, dz : xs.webThickness / 2},
        plateMaterial, {}
    )
    result["webJoint2"] = new Extrude(
        webJoint1, xs.webJointThickness,
        {refPoint : webPoint1, dz : - xs.webJointThickness - xs.webThickness / 2},
        plateMaterial, {}
    )
    result["webBolt1"] = new Bolt(
        BoltLayout(wBolt.G, wBolt.P, "Y", webJoint1),
        WebBolt, webPoint1, boltMaterial, {}
    )
    result["webJoint3"] = new Extrude(
        webJoint1, xs.webJointThickness,
        {refPoint : webPoint2, dz : xs.webThickness / 2},
        plateMaterial, {}
    )
    result["webJoint4"] = new Extrude(
        webJoint1, xs.webJointThickness,
        {refPoint : webPoint2, dz : - xs.webJointThickness - xs.webThickness / 2},
        plateMaterial, {}
    )
    result["webBolt2"] = new Bolt(
        BoltLayout(wBolt.G, wBolt.P, "Y", webJoint1),
        WebBolt, webPoint2, boltMaterial, {}
    )

    let joint1 = [{ x: - xs.flangeJointLength / 2, y: - xs.flangeWidth / 2 },
    { x: xs.flangeJointLength / 2, y: - xs.flangeWidth / 2 },
    { x: xs.flangeJointLength / 2, y: xs.flangeWidth / 2 },
    { x: - xs.flangeJointLength / 2, y: xs.flangeWidth / 2 }]
    let joint2 = [{ x: - xs.flangeJointLength / 2, y: - xs.flangeWidth / 2 },
    { x: xs.flangeJointLength / 2, y: - xs.flangeWidth / 2 },
    { x: xs.flangeJointLength / 2, y: - xs.flangeWidth / 2 + xs.flangeJointWidth },
    { x: - xs.flangeJointLength / 2, y: - xs.flangeWidth / 2 + xs.flangeJointWidth }]
    let joint3 = [{ x: - xs.flangeJointLength / 2, y: xs.flangeWidth / 2 },
    { x: xs.flangeJointLength / 2, y: xs.flangeWidth / 2 },
    { x: xs.flangeJointLength / 2, y: xs.flangeWidth / 2 - xs.flangeJointWidth },
    { x: - xs.flangeJointLength / 2, y: xs.flangeWidth / 2 - xs.flangeJointWidth }]
  
    let uflangeBolt = {
      P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: xs.flangeJointThickness * 2 + xs.flangeThickness,
    };
    let lflangeBolt = {
      P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: xs.flangeJointThickness * 2 + xs.flangeThickness,
    };

    let uPoint1 = {...(new RefPoint(PointToSkewedGlobal(webPoints[3], centerPoint), ref.xAxis, 0)), yRotation : uRad}
    let uPoint2 = {...(new RefPoint(PointToSkewedGlobal(webPoints[2], centerPoint), ref.xAxis, 0)), yRotation : uRad}
    result["upperJoint1"] = new Extrude(
        joint1, xs.webJointThickness,
        {refPoint : uPoint1, dz : xs.flangeThickness},
        plateMaterial, {}
    )
    result["upperJoint2"] = new Extrude(
        joint2, xs.webJointThickness,
        {refPoint : uPoint1, dz : - xs.flangeJointThickness},
        plateMaterial, {}
    )
    result["upperJoint3"] = new Extrude(
        joint3, xs.webJointThickness,
        {refPoint : uPoint1, dz : - xs.flangeJointThickness},
        plateMaterial, {}
    )
    result["upperJointBolt1"] = new Bolt(
        [...BoltLayout(fBolt.G, fBolt.P, "y", joint2, centerPoint.skew), ...BoltLayout(fBolt.G, fBolt.P, "y", joint3, centerPoint.skew)],
        uflangeBolt, PointToGlobal(new Point(0,0,xs.flangeThickness/2), uPoint1), boltMaterial, {}
    )
    result["upperJoint11"] = new Extrude(
        joint1, xs.webJointThickness,
        {refPoint : uPoint2, dz : xs.flangeThickness},
        plateMaterial, {}
    )
    result["upperJoint22"] = new Extrude(
        joint2, xs.webJointThickness,
        {refPoint : uPoint2, dz : - xs.flangeJointThickness},
        plateMaterial, {}
    )
    result["upperJoint33"] = new Extrude(
        joint3, xs.webJointThickness,
        {refPoint : uPoint2, dz : - xs.flangeJointThickness},
        plateMaterial, {}
    )
    result["upperJointBolt11"] = new Bolt(
        [...BoltLayout(fBolt.G, fBolt.P, "y", joint2, centerPoint.skew), ...BoltLayout(fBolt.G, fBolt.P, "y", joint3, centerPoint.skew)],
        uflangeBolt, PointToGlobal(new Point(0,0,xs.flangeThickness/2), uPoint2), boltMaterial, {}
    )
    let lPoint1 = {...(new RefPoint(PointToSkewedGlobal(webPoints[0], centerPoint), ref.xAxis, 0)), yRotation : lRad}
    let lPoint2 = {...(new RefPoint(PointToSkewedGlobal(webPoints[1], centerPoint), ref.xAxis, 0)), yRotation : lRad}
  
    result["lowerJoint1"] = new Extrude(
        joint1, xs.webJointThickness,
        {refPoint : lPoint1, dz : - xs.flangeThickness - xs.flangeJointThickness},
        plateMaterial, {}
    )
    result["lowerJoint2"] = new Extrude(
        joint2, xs.webJointThickness,
        {refPoint : lPoint1, dz : 0},
        plateMaterial, {}
    )
    result["lowerJoint3"] = new Extrude(
        joint3, xs.webJointThickness,
        {refPoint : lPoint1, dz : 0},
        plateMaterial, {}
    )
    result["lowerJointBolt1"] = new Bolt(
        [...BoltLayout(fBolt.G, fBolt.P, "y", joint2, centerPoint.skew), ...BoltLayout(fBolt.G, fBolt.P, "y", joint3, centerPoint.skew)],
        uflangeBolt, PointToGlobal(new Point(0,0,-xs.flangeThickness/2), lPoint1), boltMaterial, {}
    )
    result["lowerJoint11"] = new Extrude(
        joint1, xs.webJointThickness,
        {refPoint : lPoint2, dz : - xs.flangeThickness - xs.flangeJointThickness},
        plateMaterial, {}
    )
    result["lowerJoint22"] = new Extrude(
        joint2, xs.webJointThickness,
        {refPoint : lPoint2, dz : 0},
        plateMaterial, {}
    )
    result["lowerJoint33"] = new Extrude(
        joint3, xs.webJointThickness,
        {refPoint : lPoint2, dz : 0},
        plateMaterial, {}
    )
    result["lowerJointBolt11"] = new Bolt(
        [...BoltLayout(fBolt.G, fBolt.P, "y", joint2, centerPoint.skew), ...BoltLayout(fBolt.G, fBolt.P, "y", joint3, centerPoint.skew)],
        lflangeBolt, PointToGlobal(new Point(0,0,-xs.flangeThickness/2), lPoint2), boltMaterial, {}
    )
    /////////////////////////////////// to the function //////////////////////////////////////////
    return result
  }

  export function BoltLayout(x, y, axis, platePoints, skew) {
    let result = [];
    let rot = skew?? 0;
    let cos = Math.cos(rot);
    let sin = Math.sin(rot);
    // 볼트배치 자동계산 모듈 // 2020.7.7 by drlim
    let cp = {
      x: (platePoints[0].x + platePoints[2].x) / 2,
      y: (platePoints[0].y + platePoints[2].y) / 2
    };
    let lx = Math.abs(platePoints[2].x - platePoints[0].x)
    let ly = Math.abs(platePoints[2].y - platePoints[0].y)
    let dx, dy, xNum, yNum, yEnd, xEnd;
  
    if (axis === "x") {
      ly = ly / 2
    } else {
      lx = lx / 2
    }
    yNum = Math.floor(ly / y)
    xNum = Math.floor(lx / x)
    if (xNum < 1) {
      xNum += 1;
      xEnd = (lx % x) / 2;
    } else {
      xEnd = (x + lx % x) / 2;
    }
    if (yNum < 1) {
      yNum += 1;
      yEnd = (ly % y) / 2;
    } else {
      yEnd = (y + ly % y) / 2;
    }
    for (let i = 0; i < xNum; i++) {
      for (let j = 0; j < yNum; j++) {
        for (let l = 0; l < 2; l++) {
          if (axis === "x") {
            dx = 0;
            dy = l == 0 ? ly / 2 : - ly / 2
          } else {
            dx = l === 0 ? lx / 2 : - lx / 2;
            dy = 0;
          }
          let xtranslate = cp.x + dx + lx / 2 - xEnd - i * x // pitch와 gage개념 다시 확인(분절면을 기준으로)
          let ytranslate = cp.y + dy + ly / 2 - yEnd - j * y
          result.push([xtranslate, ytranslate]);
        }
      }
    }
    return result
  }