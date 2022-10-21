import { GetRefPoint, PointToGlobal, p } from "@nexivil/package-modules";
import { ToDimCont } from "@nexivil/package-modules/src/temp";
import { plateSectionRef } from "../reference/plate";
import {
    GenHPlate,
    GenHPlate_rev,
    GenVPlate,
    GetPlateRestPoint,
    GetSectionDimensionDict,
    GetWeldingPoint,
    scallop,
    SectionPointToSectionView,
} from "./utils";

export function GenVStiffModelFn(gridPointDict, sectionPointDict, vStiffLayout, vStiffSectionList) {
    const section = 2;
    let model = { parent: [], children: [] };

    for (let i = 0; i < vStiffLayout.length; i++) {
        for (let j = 0; j < vStiffLayout[i].length; j++) {
            let gridkey = "G" + (i + 1).toFixed(0) + "V" + (j + 1).toFixed(0); //vStiffLayout[i][position];
            let vSectionName = vStiffLayout[i][j][section];
            let vSection = vStiffSectionList[vSectionName];
            let sectionPoint = sectionPointDict[gridkey].forward;
            if (vStiffFnMap[vSectionName]) {
                // if (vStiffFnMap[vSectionName] && ["박스부-수직보강"].includes(vSectionName)) {
                let vstiff = vStiffFnMap[vSectionName](sectionPoint, gridPointDict[gridkey], vSection, gridkey, vSectionName, plateSectionRef);
                model["children"].push(...vstiff.children);
                model["parent"].push(...vstiff.parent);
            }
        }
    }
    return { model };
}

export function GenHStiffModelFn(gridPointDict, sectionPointDict, hStiffLayout, isStiff = true) {
    let model = { parent: [], children: [] };
    const from = 0;
    const to = 1;
    if (isStiff) {
        for (let i = 0; i < hStiffLayout.length; i++) {
            if (hStiffLayout[i][from] && hStiffLayout[i][to]) {
                let pk1 = hStiffLayout[i][from];
                let pk2 = hStiffLayout[i][to];
                let point1 = gridPointDict[pk1];
                let point2 = gridPointDict[pk2];
                let webPoints1 = [
                    sectionPointDict[pk1].forward.web[0][0],
                    sectionPointDict[pk1].forward.web[0][1],
                    sectionPointDict[pk1].forward.web[1][0],
                    sectionPointDict[pk1].forward.web[1][1],
                ];
                let webSide1 = sectionPointDict[pk1].forward.webSide;
                let webPoints2 = [
                    sectionPointDict[pk2].backward.web[0][0],
                    sectionPointDict[pk2].backward.web[0][1],
                    sectionPointDict[pk2].backward.web[1][0],
                    sectionPointDict[pk2].backward.web[1][1],
                ];
                let webSide2 = sectionPointDict[pk2].backward.webSide;
                let hstiff = GenHStiff(point1, point2, webPoints1, webPoints2, webSide1, webSide2, hStiffLayout[i], pk1, pk2);
                model["children"].push(...hstiff.children);
                model["parent"].push(...hstiff.parent);
            }
        }
    }
    return { model };
}

// TODO: key name 수정 요망
const vStiffFnMap = {
    개구부수직보강: function (sectionPoint, gridPoint, vSection, gridkey, diaSectionName, sectionDB) {
        return HMvStiff1V2(sectionPoint, gridPoint, vSection, gridkey, diaSectionName, sectionDB);
    },
    수직보강1: function (sectionPoint, gridPoint, vSection, gridkey, diaSectionName) {
        return DYVstiff0V2(sectionPoint, gridPoint, vSection, gridkey, diaSectionName);
    },
    수직보강2: function (sectionPoint, gridPoint, vSection, gridkey, diaSectionName) {
        return GenVStiff_Plate(sectionPoint, gridPoint, vSection, gridkey, diaSectionName);
    },
    "박스부-수직보강": function (sectionPoint, gridPoint, vSection, gridkey, diaSectionName) {
        return GenVStiff_Box(sectionPoint, gridPoint, vSection, gridkey, diaSectionName);
    },
};

export function GenHStiff(point1, point2, webPoints1, webPoints2, webSide1, webSide2, hstiffLayout, pk1, pk2) {
    const startOffset = hstiffLayout[2] * 1;
    const endOffset = hstiffLayout[3] * 1;
    const width = hstiffLayout[4] * 1;
    const thickness = hstiffLayout[5] * 1;
    const chamfer = hstiffLayout[6] * 1;
    const isTop = hstiffLayout[7];
    const offset1 = hstiffLayout[8] * 1;
    const offset2 = hstiffLayout[9] * 1;
    let result = { parent: [], children: [] };

    const bl1 = webPoints1[0];
    const tl1 = webPoints1[1];
    const br1 = webPoints1[2];
    const tr1 = webPoints1[3];
    const bl2 = webPoints2[0];
    const tl2 = webPoints2[1];
    const br2 = webPoints2[2];
    const tr2 = webPoints2[3];

    const lcot1 = (tl1.x - bl1.x) / (tl1.y - bl1.y);
    const rcot1 = (tr1.x - br1.x) / (tr1.y - br1.y);
    const lcot2 = (tl2.x - bl2.x) / (tl2.y - bl2.y);
    const rcot2 = (tr2.x - br2.x) / (tr2.y - br2.y);

    let lnode1 = isTop ? { x: tl1.x - lcot1 * offset1, y: tl1.y - offset1 } : { x: bl1.x + lcot1 * offset1, y: bl1.y + offset1 };
    let lnode2 = isTop ? { x: tl2.x - lcot2 * offset2, y: tl2.y - offset2 } : { x: bl2.x + lcot2 * offset2, y: bl2.y + offset2 };
    let lgn1 = PointToGlobal(lnode1, point1); //leftGlobalNode
    let lgn2 = PointToGlobal(lnode2, point2);
    // console.log("-----------------");
    // console.log(point1, point2);
    // console.log(lgn1, lgn2);
    let rnode1 = isTop ? { x: tr1.x - rcot1 * offset1, y: tr1.y - offset1 } : { x: br1.x + rcot1 * offset1, y: br1.y + offset1 };
    let rnode2 = isTop ? { x: tr2.x - rcot2 * offset2, y: tr2.y - offset2 } : { x: br2.x + rcot2 * offset2, y: br2.y + offset2 };
    let rgn1 = PointToGlobal(rnode1, point1); //rightGlobalNode
    let rgn2 = PointToGlobal(rnode2, point2);
    let lvec = [lgn2.x - lgn1.x, lgn2.y - lgn1.y, lgn2.z - lgn1.z];
    let lLength = Math.sqrt(lvec[0] ** 2 + lvec[1] ** 2 + lvec[2] ** 2);
    let lLength2D = Math.sqrt(lvec[0] ** 2 + lvec[1] ** 2);
    let rvec = [rgn2.x - rgn1.x, rgn2.y - rgn1.y, rgn2.z - rgn1.z];
    let rLength = Math.sqrt(rvec[0] ** 2 + rvec[1] ** 2 + rvec[2] ** 2);
    let rLength2D = Math.sqrt(rvec[0] ** 2 + rvec[1] ** 2);
    let lCenterPoint = {
        x: (lgn1.x + lgn2.x) / 2,
        y: (lgn1.y + lgn2.y) / 2,
        z: (lgn1.z + lgn2.z) / 2,
        normalCos: lvec[1] / lLength2D,
        normalSin: -lvec[0] / lLength2D,
        offset: point1.offset + (lnode1.x + lnode2.x) / 2,
        girderStation: (point1.girderStation + point2.girderStation) / 2,
        dz: (lgn1.dz + lgn2.dz) / 2,
        gradientX: (point1.gradientX + point2.gradientX) / 2,
    };
    let rCenterPoint = {
        x: (rgn1.x + rgn2.x) / 2,
        y: (rgn1.y + rgn2.y) / 2,
        z: (rgn1.z + rgn2.z) / 2,
        normalCos: rvec[1] / rLength2D,
        normalSin: -rvec[0] / rLength2D,
        offset: point1.offset + (rnode1.x + rnode2.x) / 2,
        girderStation: (point1.girderStation + point2.girderStation) / 2,
        dz: (rgn1.dz + rgn2.dz) / 2,
        gradientX: (point1.gradientX + point2.gradientX) / 2,
    };
    let lcRefPt = GetRefPoint(lCenterPoint);
    let rcRefpt = GetRefPoint(rCenterPoint);

    let lRotX = Math.atan(lvec[2] / lLength2D);
    let rRotX = Math.atan(rvec[2] / rLength2D);
    let lRotY = Math.atan(lcot1);
    let rRotY = Math.atan(rcot1);

    let lPlate = [
        { x: 0, y: -lLength / 2 + startOffset },
        { x: 0, y: lLength / 2 - endOffset },
        { x: width - chamfer, y: lLength / 2 - endOffset },
        { x: width, y: lLength / 2 - endOffset - chamfer },
        { x: width, y: -lLength / 2 + startOffset + chamfer },
        { x: width - chamfer, y: -lLength / 2 + startOffset },
    ];
    let rPlate = [
        { x: 0, y: -rLength / 2 + startOffset },
        { x: 0, y: rLength / 2 - endOffset },
        { x: -(width - chamfer), y: rLength / 2 - endOffset },
        { x: -width, y: rLength / 2 - endOffset - chamfer },
        { x: -width, y: -rLength / 2 + startOffset + chamfer },
        { x: -(width - chamfer), y: -rLength / 2 + startOffset },
    ];
    let partName = pk1 + pk2;
    let name2 = isTop ? "Top" : "Bottom";
    // let sideY1 = isTop ? webSide1[1] - offset1 : webSide1[0] + offset1;
    // let sideY2 = isTop ? webSide2[1] - offset1 : webSide2[0] + offset1;
    // // leftPlateModel.model.sideView = [
    // //     p(lCenterPoint.girderStation - lLength / 2 + startOffset, sideY1),
    // //     p(lCenterPoint.girderStation + lLength / 2 - endOffset, sideY2),
    // //     p(lCenterPoint.girderStation + lLength / 2 - endOffset, sideY2 + thickness),
    // //     p(lCenterPoint.girderStation - lLength / 2 + startOffset, sideY1 + thickness),
    // // ];

    // lCenterPoint.dz = 0
    let leftPlateModel = GenHPlate_rev(lPlate, lcRefPt, thickness, 0, 0, lRotX, lRotY, null, {}, {}, true);
    leftPlateModel.meta = { ...leftPlateModel.meta, part: "test", key: "left" + name2, girder: point1.girderNum, seg: point1.segNum };
    result["children"].push(leftPlateModel);

    // result["children"].push({
    //     ...leftPlate,
    //     meta: { part: partName, key: "left" + name2, girder: point1.girderNum, seg: point1.segNum },
    //     properties: {},
    //     weld: [
    //         {
    //             type: "FF",
    //             thickness1: thickness,
    //             thickness2: thickness,
    //             line: [[lPlate[0], lPlate[1]]],
    //             sideView: {
    //                 point: GetWeldingPoint([leftPlate["model"].sideView[0], leftPlate["model"].sideView[1]], 0.5),
    //                 isUpper: true,
    //                 isRight: true,
    //                 isXReverse: false,
    //                 isYReverse: false,
    //             },
    //         },
    //     ],
    //     textLabel: {},
    //     dimension: {},
    // });

    let rightPlateModel = GenHPlate_rev(rPlate, rcRefpt, thickness, 0, 0, rRotX, rRotY);
    rightPlateModel.meta = { ...rightPlateModel.meta, partk: partName, key: "right" + name2, girder: point1.girderNum, seg: point1.segNum };
    result["children"].push(rightPlateModel);

    // result["children"].push({
    //     ...hPlateGenV2(rPlate, rCenterPoint, thickness, 0, 90, rRotX, rRotY, null, false, null, false),
    //     meta: { part: partName, key: "right" + name2, girder: point1.girderNum, seg: point1.segNum },
    //     properties: {},
    //     weld: [
    //         {
    //             type: "FF",
    //             thickness1: thickness,
    //             thickness2: thickness,
    //             line: [[rPlate[0], rPlate[1]]],
    //         },
    //     ],
    //     textLabel: {},
    //     dimension: {},
    // });
    return result;
}

function GenVStiff_Box(sectionPoint, point, diaSection, gridkey, vSectionName) {
    let result = {
        parent: [],
        children: [],
    };
    let urib = sectionPoint.input.Urib;

    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];

    const refPoint = GetRefPoint(point);
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    const gradCos = (tr.x - tl.x) / Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2);
    const fontSize = 14;
    const layer = "DIM";

    let webPlate = [
        { x: tl.x - lwCot * diaSection.webHeight, y: tl.y - diaSection.webHeight },
        { x: tr.x - rwCot * diaSection.webHeight, y: tr.y - diaSection.webHeight },
        tr,
        tl,
    ]; // 첫번째 면이 rib에 해당되도록
    let urib2 = urib;
    urib2.ribHoleD = diaSection.ribHoleD;
    urib2.ribHoleR = diaSection.ribHoleR;

    let webPlateMeta = { part: gridkey, key: "webPlate", girder: point.girderNum, seg: point.segNum };
    let webPlateAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[webPlate[0], webPlate[3]]],
                sectionView: {
                    point: GetWeldingPoint([webPlate[0], webPlate[3]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[webPlate[1], webPlate[2]]],
                sectionView: {
                    point: GetWeldingPoint([webPlate[1], webPlate[2]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tuf,
                line: [[webPlate[2], webPlate[3]]],
                sectionView: {
                    point: GetWeldingPoint([webPlate[2], webPlate[3]], 0.5),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.upperTopThickness,
                line: [[webPlate[0], webPlate[1]]],
                sectionView: {
                    point: GetWeldingPoint([webPlate[0], webPlate[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let webPlateModel = GenVPlate(
        webPlate,
        point,
        diaSection.webThickness,
        [0, 1, 2, 3],
        diaSection.scallopRadius,
        urib2,
        null,
        [],
        [2, 3],
        [0, 1, 2, 3],
        null,
        webPlateMeta,
        webPlateAdd
    );

    result["children"].push(webPlateModel);

    let lowerPlate2 = [
        { x: (tl.x - lwCot * (diaSection.webHeight + diaSection.upperTopThickness)) / gradCos, y: -diaSection.upperTopWidth / 2 },
        { x: (tl.x - lwCot * (diaSection.webHeight + diaSection.upperTopThickness)) / gradCos, y: diaSection.upperTopWidth / 2 },
        { x: (tr.x - rwCot * (diaSection.webHeight + diaSection.upperTopThickness)) / gradCos, y: diaSection.upperTopWidth / 2 },
        { x: (tr.x - rwCot * (diaSection.webHeight + diaSection.upperTopThickness)) / gradCos, y: -diaSection.upperTopWidth / 2 },
    ];
    let lowerPlate = [
        webPlate[0],
        { x: tl.x - lwCot * (diaSection.webHeight + diaSection.upperTopThickness), y: tl.y - diaSection.webHeight - diaSection.upperTopThickness },
        { x: tr.x - rwCot * (diaSection.webHeight + diaSection.upperTopThickness), y: tr.y - diaSection.webHeight - diaSection.upperTopThickness },
        webPlate[1],
    ];

    let lpPt = PointToGlobal({ x: 0, y: -gradient * tl.x + tl.y - diaSection.webHeight - diaSection.upperTopThickness }, refPoint);
    let lowerPlateCenterPoint = { ...refPoint, x: lpPt.x, y: lpPt.y, z: lpPt.z };
    let lowerPlateMeta = { part: gridkey, key: "lowerflange", girder: point.girderNum, seg: point.segNum };
    let lowerPlateAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.upperTopThickness,
                thickness2: sectionPoint.input.tw,
                line: [[lowerPlate2[0], lowerPlate2[1]]],
                sectionView: {
                    point: lowerPlate[0],
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.upperTopThickness,
                thickness2: sectionPoint.input.tw,
                line: [[lowerPlate2[2], lowerPlate2[3]]],
                sectionView: {
                    point: lowerPlate[3],
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    };

    let lowerPlateModel = GenHPlate(
        lowerPlate2,
        lowerPlateCenterPoint,
        diaSection.upperTopThickness,
        0,
        point.skew,
        0,
        -Math.atan(gradient),
        lowerPlate,
        false,
        [0, 1],
        true,
        null,
        lowerPlateMeta,
        lowerPlateAdd
    );
    result["children"].push(lowerPlateModel);

    let stiffnerPoint = [
        [bl, lowerPlate[1]],
        [br, lowerPlate[2]],
    ];
    let stiffnerModelList = [];
    for (let i = 0; i < stiffnerPoint.length; i++) {
        let stiffWidth = i % 2 === 0 ? diaSection.stiffWidth : -diaSection.stiffWidth;
        let stiffner = GetPlateRestPoint(stiffnerPoint[i][0], stiffnerPoint[i][1], 0, gradient, stiffWidth);
        let side2D = i % 2 === 0 ? null : [0, 3, 2, 1];
        // let stiffnerMeta = { part: gridkey, key: "stiffner" + i.toFixed(0), girder: point.girderNum, seg: point.segNum };
        let stiffnerMeta = { part: gridkey, key: "stiffner", girder: point.girderNum, seg: point.segNum };
        let stiffnerAdd = {
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[stiffner[0], stiffner[1]]],
                    sectionView: {
                        point: GetWeldingPoint([stiffner[0], stiffner[1]], 0.5),
                        isUpper: true,
                        isRight: i === 0 ? true : false,
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: sectionPoint.input.tlf,
                    line: [[stiffner[0], stiffner[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: diaSection.upperTopThickness,
                    line: [[stiffner[1], stiffner[2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        };
        let stiffnerModel = GenVPlate(
            stiffner,
            point,
            diaSection.stiffThickness,
            [0, 1],
            diaSection.scallopRadius,
            null,
            null,
            [],
            null,
            side2D,
            [0, 3],
            stiffnerMeta,
            stiffnerAdd
        );
        result["children"].push(stiffnerModel);
        stiffnerModelList.push(stiffnerModel);
    }

    let topLeftDimPoints = [webPlateModel["model"]["topView"][3], webPlateModel["model"]["topView"][2]];
    let topRightDimPoints = [webPlateModel["model"]["topView"][0], webPlateModel["model"]["topView"][1]];
    let bottomLeftDimPoints = [
        lowerPlateModel["model"]["bottomView"][0],
        stiffnerModelList[0]["model"]["bottomView"][0],
        stiffnerModelList[0]["model"]["bottomView"][1],
        lowerPlateModel["model"]["bottomView"][1],
    ];
    let bottomRightDimPoints = [
        lowerPlateModel["model"]["bottomView"][3],
        stiffnerModelList[1]["model"]["bottomView"][3],
        stiffnerModelList[1]["model"]["bottomView"][2],
        lowerPlateModel["model"]["bottomView"][2],
    ];

    let sectionLeftDimPoints = [lowerPlate[0], lowerPlate[1]];
    let sectionRightDimPoints = [lowerPlate[2], lowerPlate[3]];

    let sd = GetSectionDimensionDict(sectionPoint);
    let sectionID =
        sectionPoint.input.wuf.toFixed(0) +
        sectionPoint.input.wlf.toFixed(0) +
        sectionPoint.input.tlf.toFixed(0) +
        sectionPoint.input.tuf.toFixed(0) +
        sectionPoint.input.tw.toFixed(0);

    result["parent"].push({
        part: gridkey,
        id:
            sectionID +
            vSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: vSectionName,
        point: point,
        model: {
            sectionView: SectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                ToDimCont([sd.top[0], sd.top[sd.top.length - 1]], fontSize, layer, true, true, 0, sd.topIndex ? 0 : 1, 2),
                ToDimCont(sd.top, fontSize, layer, true, true, 0, sd.topIndex ? 0 : sd.top.length - 1, 1),
                ToDimCont([sd.bottom[0], sd.bottom[sd.bottom.length - 1]], fontSize, layer, true, false, 0, 0, 2),
                ToDimCont(sd.bottom, fontSize, layer, true, false, 0, 0, 1),
                ToDimCont(sd.left, fontSize, layer, false, false, 0, 0, 4),
                ToDimCont([...sd.left, ...sectionLeftDimPoints], fontSize, layer, false, false, 0, 0, 3),
                ToDimCont(sd.right, fontSize, layer, false, true, 0, 0, 4),
                ToDimCont([...sd.right, ...sectionRightDimPoints], fontSize, layer, false, true, 0, 0, 3),
            ],
            topView: [
                ToDimCont(topLeftDimPoints, fontSize, layer, false, false, 0, 0, 1),
                ToDimCont(topRightDimPoints, fontSize, layer, false, true, 0, 0, 1),
            ],
            bottomView: [
                ToDimCont([bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimCont(bottomLeftDimPoints, fontSize, layer, false, false, 0, 0, 3),
                ToDimCont([bottomRightDimPoints[0], bottomRightDimPoints[bottomRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 4),
                ToDimCont(bottomRightDimPoints, fontSize, layer, false, true, 0, 0, 3),
            ],
        },
    });
    return result;
}

function GenVStiff_Plate(sectionPoint, point, vSection, gridkey, vSectionName) {
    let result = {
        parent: [],
        children: [],
    };

    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];

    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    const fontSize = 14;
    const layer = "DIM";

    let lowerPoints = [
        { x: bl.x + lwCot * vSection.lowerSpacing, y: bl.y + vSection.lowerSpacing },
        { x: br.x + rwCot * vSection.lowerSpacing, y: br.y + vSection.lowerSpacing },
    ];

    let leftPoints = [];
    let left = GetPlateRestPoint(lowerPoints[0], tl, 0, gradient, vSection.stiffWidth);
    leftPoints.push(left[0]);
    leftPoints.push(left[1]);
    leftPoints.push(left[2]);
    leftPoints.push(...scallop(left[2], left[3], left[0], vSection.chamfer, 1));

    let leftMeta = { part: gridkey, key: "left", girder: point.girderNum, seg: point.segNum };
    let leftAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: vSection.stiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[left[0], left[1]]],
                sectionView: {
                    point: GetWeldingPoint([left[0], left[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let leftModel = GenVPlate(
        leftPoints,
        point,
        vSection.stiffThickness,
        [1],
        vSection.scallopRadius,
        null,
        null,
        [],
        [1, 2],
        [1, 2, 4, 0],
        [0, 3],
        leftMeta,
        leftAdd
    );
    result["children"].push(leftModel);

    let rightPoints = [];
    let right = GetPlateRestPoint(lowerPoints[1], tr, 0, gradient, -vSection.stiffWidth);
    rightPoints.push(right[0]);
    rightPoints.push(right[1]);
    rightPoints.push(right[2]);
    rightPoints.push(...scallop(right[2], right[3], right[0], vSection.chamfer, 1));
    let rightMeta = { part: gridkey, key: "right", girder: point.girderNum, seg: point.segNum };
    let rightAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: vSection.stiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[right[0], right[1]]],
                sectionView: {
                    point: GetWeldingPoint([right[0], right[1]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let rightModel = GenVPlate(
        rightPoints,
        point,
        vSection.stiffThickness,
        [1],
        vSection.scallopRadius,
        null,
        null,
        [],
        [1, 2],
        null,
        [0, 3],
        rightMeta,
        rightAdd
    );
    result["children"].push(rightModel);

    let topLeftDimPoints = [leftModel["model"]["topView"][0], leftModel["model"]["topView"][1]];
    let topLeftDimPoints2 = [leftModel["model"]["topView"][0], leftModel["model"]["topView"][3]];
    let topRightDimPoints = [rightModel["model"]["topView"][0], rightModel["model"]["topView"][1]];
    let topRightDimPoints2 = [rightModel["model"]["topView"][0], rightModel["model"]["topView"][3]];
    let bottomLeftDimPoints = [leftModel["model"]["bottomView"][0], leftModel["model"]["bottomView"][1]];
    let bottomRightDimPoints = [rightModel["model"]["bottomView"][0], rightModel["model"]["bottomView"][1]];
    let sectionLeftDimPoints = [left[0]];
    let sectionRightDimPoints = [right[0]];
    let sd = GetSectionDimensionDict(sectionPoint);
    let sectionID =
        sectionPoint.input.wuf.toFixed(0) +
        sectionPoint.input.wlf.toFixed(0) +
        sectionPoint.input.tlf.toFixed(0) +
        sectionPoint.input.tuf.toFixed(0) +
        sectionPoint.input.tw.toFixed(0);
    result["parent"].push({
        part: gridkey,
        id:
            sectionID +
            vSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: vSectionName,
        point: point,
        model: {
            sectionView: SectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                ToDimCont([sd.top[0], sd.top[sd.top.length - 1]], fontSize, layer, true, true, 0, sd.topIndex ? 0 : 1, 2),
                ToDimCont(sd.top, fontSize, layer, true, true, 0, sd.topIndex ? 0 : sd.top.length - 1, 1),
                ToDimCont([sd.bottom[0], sd.bottom[sd.bottom.length - 1]], fontSize, layer, true, false, 0, 0, 2),
                ToDimCont(sd.bottom, fontSize, layer, true, false, 0, 0, 1),
                ToDimCont(sd.left, fontSize, layer, false, false, 0, 0, 4),
                ToDimCont([...sd.left, ...sectionLeftDimPoints], fontSize, layer, false, false, 0, 0, 3),
                ToDimCont(sd.right, fontSize, layer, false, true, 0, 0, 4),
                ToDimCont([...sd.right, ...sectionRightDimPoints], fontSize, layer, false, true, 0, 0, 3),
            ],
            topView: [
                ToDimCont(topLeftDimPoints, fontSize, layer, false, false, 0, 0, 0),
                ToDimCont(topRightDimPoints, fontSize, layer, false, true, 0, 0, 0),
                ToDimCont(topLeftDimPoints2, fontSize, layer, true, true, 0, 0, 0),
                ToDimCont(topRightDimPoints2, fontSize, layer, true, true, 0, 0, 0),
            ],
            bottomView: [
                ToDimCont(bottomLeftDimPoints, fontSize, layer, false, false, 0, 0, 0),
                ToDimCont(bottomRightDimPoints, fontSize, layer, false, true, 0, 0, 0),
                ToDimCont(topLeftDimPoints2, fontSize, layer, true, true, 0, 0, 0),
                ToDimCont(topRightDimPoints2, fontSize, layer, true, true, 0, 0, 0),
            ],
        },
    });
    return result;
}
