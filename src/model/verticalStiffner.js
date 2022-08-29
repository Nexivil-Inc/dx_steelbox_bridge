import { GetRefPoint, PointToGlobal, ToDimAlign } from "@nexivil/package-modules";
import { plateSectionRef } from "../reference/plate";
import { GenHPlate, GenVPlate, GetPlateRestPoint, GetSectionDimensionDict, GetWeldingPoint, scallop, SectionPointToSectionView } from "./utils";

export function GenVStiffModelFn(gridPoint, sectionPointDict, vStiffLayout, vStiffSectionList) {
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
                let dia = vStiffFnMap[vSectionName](sectionPoint, gridPoint[gridkey], vSection, gridkey, vSectionName, plateSectionRef);
                model["children"].push(...dia.children);
                model["parent"].push(...dia.parent);
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
        let stiffnerMeta = { part: gridkey, key: "stiffner" + i.toFixed(0), girder: point.girderNum, seg: point.segNum };
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
                ToDimAlign([sd.top[0], sd.top[sd.top.length - 1]], fontSize, layer, true, true, 0, sd.topIndex ? 0 : 1, 2),
                ToDimAlign(sd.top, fontSize, layer, true, true, 0, sd.topIndex ? 0 : sd.top.length - 1, 1),
                ToDimAlign([sd.bottom[0], sd.bottom[sd.bottom.length - 1]], fontSize, layer, true, false, 0, 0, 2),
                ToDimAlign(sd.bottom, fontSize, layer, true, false, 0, 0, 1),
                ToDimAlign(sd.left, fontSize, layer, false, false, 0, 0, 4),
                ToDimAlign([...sd.left, ...sectionLeftDimPoints], fontSize, layer, false, false, 0, 0, 3),
                ToDimAlign(sd.right, fontSize, layer, false, true, 0, 0, 4),
                ToDimAlign([...sd.right, ...sectionRightDimPoints], fontSize, layer, false, true, 0, 0, 3),
            ],
            topView: [
                ToDimAlign(topLeftDimPoints, fontSize, layer, false, false, 0, 0, 1),
                ToDimAlign(topRightDimPoints, fontSize, layer, false, true, 0, 0, 1),
            ],
            bottomView: [
                ToDimAlign([bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimAlign(bottomLeftDimPoints, fontSize, layer, false, false, 0, 0, 3),
                ToDimAlign([bottomRightDimPoints[0], bottomRightDimPoints[bottomRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 4),
                ToDimAlign(bottomRightDimPoints, fontSize, layer, false, true, 0, 0, 3),
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
                ToDimAlign([sd.top[0], sd.top[sd.top.length - 1]], fontSize, layer, true, true, 0, sd.topIndex ? 0 : 1, 2),
                ToDimAlign(sd.top, fontSize, layer, true, true, 0, sd.topIndex ? 0 : sd.top.length - 1, 1),
                ToDimAlign([sd.bottom[0], sd.bottom[sd.bottom.length - 1]], fontSize, layer, true, false, 0, 0, 2),
                ToDimAlign(sd.bottom, fontSize, layer, true, false, 0, 0, 1),
                ToDimAlign(sd.left, fontSize, layer, false, false, 0, 0, 4),
                ToDimAlign([...sd.left, ...sectionLeftDimPoints], fontSize, layer, false, false, 0, 0, 3),
                ToDimAlign(sd.right, fontSize, layer, false, true, 0, 0, 4),
                ToDimAlign([...sd.right, ...sectionRightDimPoints], fontSize, layer, false, true, 0, 0, 3),
            ],
            topView: [
                ToDimAlign(topLeftDimPoints, fontSize, layer, false, false, 0, 0, 0),
                ToDimAlign(topRightDimPoints, fontSize, layer, false, true, 0, 0, 0),
                ToDimAlign(topLeftDimPoints2, fontSize, layer, true, true, 0, 0, 0),
                ToDimAlign(topRightDimPoints2, fontSize, layer, true, true, 0, 0, 0),
            ],
            bottomView: [
                ToDimAlign(bottomLeftDimPoints, fontSize, layer, false, false, 0, 0, 0),
                ToDimAlign(bottomRightDimPoints, fontSize, layer, false, true, 0, 0, 0),
                ToDimAlign(topLeftDimPoints2, fontSize, layer, true, true, 0, 0, 0),
                ToDimAlign(topRightDimPoints2, fontSize, layer, true, true, 0, 0, 0),
            ],
        },
    });
    return result;
}
