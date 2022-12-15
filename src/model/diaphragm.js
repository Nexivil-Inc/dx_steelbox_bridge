// import {} from "global";
import { GetFilletPoints2D, GetRefPoint, PointToGlobal } from "@nexivil/package-modules";
import { ToDimCont } from "@nexivil/package-modules/src/temp";
import { plateSectionRef } from "../reference/plate";
import { GenVPlate, GenHPlate, GetPlateRestPoint, GetSectionDimensionDict, GetWeldingPoint, scallop, SectionPointToSectionView } from "./utils";

export function GenDiaphragmModelFn(gridPoint, sectionPointDict, diaphragmLayout, diaphragmSectionList) {
    const diaSectionDict = plateSectionRef;
    const section = 2;
    let result = { parent: [], children: [] };
    let xbeamData = [];
    for (let i = 0; i < diaphragmLayout.length; i++) {
        for (let j = 0; j < diaphragmLayout[i].length; j++) {
            let gridkey = "G" + (i + 1).toFixed(0) + "D" + (j + 1).toFixed(0); // iaphragmLayout[i][position];
            let diaSectionName = diaphragmLayout[i][j][section];
            let diaSection = diaphragmSectionList[diaSectionName];
            let xbData, xbSection;
            if (diaFnMap[diaSectionName]) {
                // if (diaFnMap[diaSectionName] && ["플레이트-중"].includes(diaSectionName)) {
                let sectionPoint = sectionPointDict[gridkey].forward;
                let dia = diaFnMap[diaSectionName](sectionPoint, gridPoint[gridkey], diaSection, gridkey, diaSectionName, diaSectionDict);
                result["children"].push(...dia.children);
                // result["parent"].push(...dia.parent);
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

    return { model: result, xbeamData };
}

const diaFnMap = {
    K형: function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName, sectionDB) {
        return uBoxDia1(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName, sectionDB);
    },
    단부지점부: function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) {
        return boxDiaHole1(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName);
    },
    중간지점부: function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) {
        return boxDiaHole1(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName);
    },
    "플레이트-하": function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) {
        return GenDiaphragm_PlateBottom(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName);
    },
    "플레이트-중": function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) {
        return GenDiaphragm_PlateCenter(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName);
    },
    // "플레이트-중-볼트": function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) { return DYdia2V2(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) },
    "플레이트-상-볼트": function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) {
        return DYdia3V2(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName);
    },
    "박스부-중앙홀": function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) {
        return GenDiaphragm_BoxHole(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName);
    },
    "박스부-지점": function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) {
        return GenDiaphragm_BoxSupport(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName);
    },
    "박스부-지점2": function (sectionPoint, gridPoint, diaSection, gridkey, diaSectionName) {
        return GenDiaphragm_BoxSupport2(sectionPoint, gridPoint, diaSection, gridkey, diaSectionName);
    },
};

function GenDiaphragm_PlateBottom(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    let result = {
        parent: [],
        children: [],
    };

    let refPoint = GetRefPoint(point);

    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    let lflangePoint = sectionPoint.lflange;
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];

    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    let diaHeight = tl.y - gradient * tr.x - bl.y;
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
            { x: lowerPlateL, y: -diaSection.lowerWidth / 2 },
            { x: lowerPlateL, y: diaSection.lowerWidth / 2 },
        ];

        let lPoint = PointToGlobal(lflangePoint[0][1], refPoint);
        let lflangeCenterPoint = { ...refPoint, x: lPoint.x, y: lPoint.y, z: lPoint.z };
        let lflangeMeta = { part: gridkey, key: "lowerflange", girder: point.girderNum, seg: point.segNum };
        let lflangeAdd = {
            properties: {},
            weld: [
                {
                    type: "B",
                    thickness1: diaSection.lowerThickness,
                    thickness2: sectionPoint.input.tlf,
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
                    type: "B",
                    thickness1: diaSection.lowerThickness,
                    thickness2: sectionPoint.input.tlf,
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
        lflangeModel = GenHPlate(
            lowerPlate2,
            lflangeCenterPoint,
            diaSection.lowerThickness,
            -diaSection.lowerThickness,
            point.skew,
            0,
            0,
            lowerPlate,
            false,
            [0, 1],
            true,
            null,
            lflangeMeta,
            lflangeAdd
        );
        result["children"].push(lflangeModel);
    }

    let upperPlate = [
        { x: bl.x + lwCot * diaSection.webHeight, y: bl.y + diaSection.webHeight },
        {
            x: bl.x + lwCot * (diaSection.webHeight + diaSection.upperThickness),
            y: bl.y + diaSection.webHeight + diaSection.upperThickness,
        },
        {
            x: br.x + rwCot * (diaSection.webHeight + diaSection.upperThickness),
            y: br.y + diaSection.webHeight + diaSection.upperThickness,
        },
        { x: br.x + rwCot * diaSection.webHeight, y: br.y + diaSection.webHeight },
    ];
    let upperPlateL = upperPlate[3].x - upperPlate[0].x;
    let upperPlate2 = [
        { x: 0, y: diaSection.upperWidth / 2 },
        { x: 0, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: diaSection.upperWidth / 2 },
    ];
    let uPoint = PointToGlobal(upperPlate[0], refPoint);
    let uflangeCenterPoint = { ...refPoint, x: uPoint.x, y: uPoint.y, z: uPoint.z };
    let uflangeMeta = { part: gridkey, key: "upperflange", girder: point.girderNum, seg: point.segNum };
    let uflangeAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.upperThickness,
                thickness2: sectionPoint.input.tw,
                line: [[upperPlate2[0], upperPlate2[1]]],
                sectionView: {
                    point: upperPlate[0],
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.upperThickness,
                thickness2: sectionPoint.input.tw,
                line: [[upperPlate2[2], upperPlate2[3]]],
                sectionView: {
                    point: upperPlate[3],
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
    let uflangeModel = GenHPlate(
        upperPlate2,
        uflangeCenterPoint,
        diaSection.upperThickness,
        0,
        point.skew,
        0,
        0,
        upperPlate,
        true,
        [0, 1],
        null,
        null,
        uflangeMeta,
        uflangeAdd
    );
    result["children"].push(uflangeModel);

    let centerPlate = [bl, br, upperPlate[3], upperPlate[0]];
    let webPlateMeta = { part: gridkey, key: "webPlate", girder: point.girderNum, seg: point.segNum };
    let webPlateAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[centerPlate[0], centerPlate[3]]],
                sectionView: {
                    point: GetWeldingPoint([centerPlate[0], centerPlate[3]], 0.5),
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
                line: [[centerPlate[1], centerPlate[2]]],
                sectionView: {
                    point: GetWeldingPoint([centerPlate[1], centerPlate[2]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.upperThickness,
                line: [[centerPlate[2], centerPlate[3]]],
                sectionView: {
                    point: GetWeldingPoint([centerPlate[2], centerPlate[3]], 0.5),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.lowerThickness,
                line: [[centerPlate[0], centerPlate[1]]],
                sectionView: {
                    point: GetWeldingPoint([centerPlate[0], centerPlate[1]], 0.5),
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
        centerPlate,
        point,
        diaSection.webThickness,
        [0, 1, 2, 3],
        diaSection.scallopRadius,
        null,
        null,
        [],
        [2, 3],
        [0, 1, 2, 3],
        [0, 1],
        webPlateMeta,
        webPlateAdd
    );

    result["children"].push(webPlateModel);

    let stiffnerPoint = [tl, upperPlate[1]];
    let stiffWidth = diaSection.stiffWidth;
    let tan1 = gradient;
    let stiffner = GetPlateRestPoint(stiffnerPoint[0], stiffnerPoint[1], tan1, 0, stiffWidth);
    let addedPoint = [
        { x: upperPlate[1].x + diaSection.stiffWidth2, y: upperPlate[1].y },
        { x: upperPlate[1].x + diaSection.stiffWidth2, y: upperPlate[1].y + 50 },
        {
            x: upperPlate[1].x + diaSection.stiffWidth,
            y: upperPlate[1].y + 50 + diaSection.stiffWidth2 - diaSection.stiffWidth,
        },
    ];

    let stiffnerPoints = [];
    stiffnerPoints.push(...scallop(stiffner[3], stiffner[0], stiffner[1], diaSection.scallopRadius, 4));
    stiffnerPoints.push(...scallop(stiffner[0], stiffner[1], stiffner[2], diaSection.scallopRadius, 4));
    stiffnerPoints.push(addedPoint[0], addedPoint[1]);
    stiffnerPoints.push(...GetFilletPoints2D(addedPoint[1], addedPoint[2], stiffner[3], diaSection.filletR, 4));
    stiffnerPoints.push(stiffner[3]);

    let stiffner2Meta = { part: gridkey, key: "stiffner2", girder: point.girderNum, seg: point.segNum };
    let stiffner2Add = {
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
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: sectionPoint.input.tuf,
                line: [[stiffner[0], stiffner[3]]],
            },
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: diaSection.upperThickness,
                line: [[stiffner[1], stiffner[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let stiffner2Model = GenVPlate(
        stiffnerPoints,
        point,
        diaSection.stiffThickness,
        [],
        diaSection.scallopRadius,
        null,
        null,
        [],
        null,
        null,
        null,
        stiffner2Meta,
        stiffner2Add
    );
    result["children"].push(stiffner2Model);

    stiffnerPoint = [tr, upperPlate[2]];
    tan1 = gradient;
    stiffner = GetPlateRestPoint(stiffnerPoint[0], stiffnerPoint[1], tan1, 0, -stiffWidth);
    addedPoint = [
        { x: upperPlate[2].x - diaSection.stiffWidth2, y: upperPlate[2].y },
        { x: upperPlate[2].x - diaSection.stiffWidth2, y: upperPlate[2].y + 50 },
        {
            x: upperPlate[2].x - diaSection.stiffWidth,
            y: upperPlate[2].y + 50 + diaSection.stiffWidth2 - diaSection.stiffWidth,
        },
    ];
    stiffnerPoints = [];
    stiffnerPoints.push(stiffner[0]);
    stiffnerPoints.push(stiffner[1]);
    stiffnerPoints.push(addedPoint[0], addedPoint[1]);
    stiffnerPoints.push(...GetFilletPoints2D(addedPoint[1], addedPoint[2], stiffner[3], diaSection.filletR, 4));
    stiffnerPoints.push(stiffner[3]);

    let stiffner3Meta = { part: gridkey, key: "stiffner3", girder: point.girderNum, seg: point.segNum };
    let stiffner3Add = {
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
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: sectionPoint.input.tuf,
                line: [[stiffner[0], stiffner[3]]],
            },
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: diaSection.upperThickness,
                line: [[stiffner[1], stiffner[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let stiffner3Model = GenVPlate(
        stiffnerPoints,
        point,
        diaSection.stiffThickness,
        [0, 1],
        diaSection.scallopRadius,
        null,
        null,
        [],
        null,
        [1, 2, 10, 0],
        null,
        stiffner3Meta,
        stiffner3Add
    );
    result["children"].push(stiffner3Model);

    let data = [
        PointToGlobal({ x: (bl.x + upperPlate[0].x) / 2, y: (bl.y + upperPlate[0].y) / 2, z: 0 }, refPoint),
        PointToGlobal({ x: (br.x + upperPlate[3].x) / 2, y: (br.y + upperPlate[3].y) / 2, z: 0 }, refPoint),
    ];

    let section = [
        diaSection.lowerWidth,
        diaSection.lowerThickness,
        diaSection.upperWidth,
        diaSection.upperThickness,
        diaSection.webHeight,
        diaSection.webThickness,
        diaSection.stiffThickness,
        diaSection.stiffWidth,
    ];

    let topLeftDimPoints = [
        uflangeModel["model"]["topView"][0],
        webPlateModel["model"]["topView"][0],
        webPlateModel["model"]["topView"][1],
        uflangeModel["model"]["topView"][1],
    ];

    let topRightDimPoints = [
        uflangeModel["model"]["topView"][3],
        webPlateModel["model"]["topView"][3],
        webPlateModel["model"]["topView"][2],
        uflangeModel["model"]["topView"][2],
    ];
    let bottomLeftDimPoints = [webPlateModel["model"]["bottomView"][0], webPlateModel["model"]["bottomView"][1]];
    let bottomRightDimPoints = [webPlateModel["model"]["bottomView"][3], webPlateModel["model"]["bottomView"][2]];
    if (lflangeModel["model"]) {
        bottomLeftDimPoints = [
            lflangeModel["model"]["bottomView"][0],
            webPlateModel["model"]["bottomView"][0],
            webPlateModel["model"]["bottomView"][1],
            lflangeModel["model"]["bottomView"][1],
        ];
        bottomRightDimPoints = [
            lflangeModel["model"]["bottomView"][3],
            webPlateModel["model"]["bottomView"][3],
            webPlateModel["model"]["bottomView"][2],
            lflangeModel["model"]["bottomView"][2],
        ];
    }

    let sectionLeftDimPoints = [upperPlate[0], upperPlate[1]];
    let sectionRightDimPoints = [upperPlate[2], upperPlate[3]];

    let sd = GetSectionDimensionDict(sectionPoint);
    diaSection["totalHeight"] = diaHeight;
    let sectionID =
        sectionPoint.input.wuf.toFixed(0) +
        sectionPoint.input.wlf.toFixed(0) +
        sectionPoint.input.tlf.toFixed(0) +
        sectionPoint.input.tuf.toFixed(0) +
        sectionPoint.input.tw.toFixed(0);

    let fontSize = 14;
    let parent = {
        part: gridkey,
        id:
            sectionID +
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        inode: gridkey + "L",
        jnode: gridkey + "R",
        key: gridkey + "X",
        isKframe: false,
        data: data,
        section: section,
        diaSection,
        properties: {},
        model: {
            sectionView: SectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                ToDimCont([sd.top[0], sd.top[sd.top.length - 1]], fontSize, "DIM", true, true, 0, sd.topIndex ? 0 : 1, 2),
                ToDimCont(sd.top, fontSize, "DIM", true, true, 0, sd.topIndex ? 0 : sd.top.length - 1, 1),
                ToDimCont([sd.bottom[0], sd.bottom[sd.bottom.length - 1]], fontSize, "DIM", true, false, 0, 0, 2),
                ToDimCont(sd.bottom, fontSize, "DIM", true, false, 0, 0, 1),
                ToDimCont(sd.left, fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont([...sd.left, ...sectionLeftDimPoints], fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont(sd.right, fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont([...sd.right, ...sectionRightDimPoints], fontSize, "DIM", false, true, 0, 0, 3),
            ],
            topView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, "DIM", false, true, 0, 0, 3),
            ],
            bottomView: [
                ToDimCont([bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]], fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont(bottomLeftDimPoints, fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont([bottomRightDimPoints[0], bottomRightDimPoints[bottomRightDimPoints.length - 1]], fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont(bottomRightDimPoints, fontSize, "DIM", false, true, 0, 0, 3),
            ],
        },
    };
    result["parent"].push(parent);
    return result;
}

function GenDiaphragm_PlateCenter(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    //ds 입력변수
    let result = {
        parent: [],
        children: [],
    };

    let refPoint = GetRefPoint(point);

    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];

    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);

    let diaHeight = tl.y - gradient * tr.x - bl.y;
    ///lower stiffener
    let lowerPlate = [
        { x: bl.x + lwCot * diaSection.lowerHeight, y: bl.y + diaSection.lowerHeight },
        {
            x: bl.x + lwCot * (diaSection.lowerHeight - diaSection.lowerThickness),
            y: bl.y + diaSection.lowerHeight - diaSection.lowerThickness,
        },
        {
            x: br.x + rwCot * (diaSection.lowerHeight - diaSection.lowerThickness),
            y: br.y + diaSection.lowerHeight - diaSection.lowerThickness,
        },
        { x: br.x + rwCot * diaSection.lowerHeight, y: br.y + diaSection.lowerHeight },
    ];
    let lowerPlateL = lowerPlate[3].x - lowerPlate[0].x;
    let lowerPlate2 = [
        { x: 0, y: diaSection.lowerWidth / 2 },
        { x: 0, y: -diaSection.lowerWidth / 2 },
        { x: lowerPlateL, y: -diaSection.lowerWidth / 2 },
        { x: lowerPlateL, y: diaSection.lowerWidth / 2 },
    ];
    let lPoint = PointToGlobal(lowerPlate[0], refPoint);
    let lflangeCenterPoint = { ...refPoint, x: lPoint.x, y: lPoint.y, z: lPoint.z };

    let lflangeMeta = { part: gridkey, key: "lowerflange", girder: point.girderNum, seg: point.segNum };
    let lflangeAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.lowerThickness,
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
                thickness1: diaSection.lowerThickness,
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
    let lflangeModel = GenHPlate(
        lowerPlate2,
        lflangeCenterPoint,
        diaSection.lowerThickness,
        -diaSection.lowerThickness,
        point.skew,
        0,
        0,
        lowerPlate,
        false,
        [0, 1],
        true,
        [],
        lflangeMeta,
        lflangeAdd
    );
    result["children"].push(lflangeModel);

    let upperPlate = [
        { x: bl.x + lwCot * diaSection.upperHeight, y: bl.y + diaSection.upperHeight },
        {
            x: bl.x + lwCot * (diaSection.upperHeight + diaSection.upperThickness),
            y: bl.y + diaSection.upperHeight + diaSection.upperThickness,
        },
        {
            x: br.x + rwCot * (diaSection.upperHeight + diaSection.upperThickness),
            y: br.y + diaSection.upperHeight + diaSection.upperThickness,
        },
        { x: br.x + rwCot * diaSection.upperHeight, y: br.y + diaSection.upperHeight },
    ];
    let upperPlateL = upperPlate[3].x - upperPlate[0].x;
    let upperPlate2 = [
        { x: 0, y: diaSection.upperWidth / 2 },
        { x: 0, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: diaSection.upperWidth / 2 },
    ];
    let uPoint = PointToGlobal(upperPlate[0], refPoint);
    let uflangeCenterPoint = { ...refPoint, x: uPoint.x, y: uPoint.y, z: uPoint.z };
    let uflangeMeta = { part: gridkey, key: "upperflange", girder: point.girderNum, seg: point.segNum };
    let uflangeAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.upperThickness,
                thickness2: sectionPoint.input.tw,
                line: [[upperPlate2[0], upperPlate2[1]]],
                sectionView: {
                    point: upperPlate[0],
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.upperThickness,
                thickness2: sectionPoint.input.tw,
                line: [[upperPlate2[2], upperPlate2[3]]],
                sectionView: {
                    point: upperPlate[3],
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
    let uflangeModel = GenHPlate(
        upperPlate2,
        uflangeCenterPoint,
        diaSection.upperThickness,
        0,
        point.skew,
        0,
        0,
        upperPlate,
        true,
        [0, 1],
        null,
        null,
        [],
        uflangeMeta,
        uflangeAdd
    );
    result["children"].push(uflangeModel);

    let centerPlate = [lowerPlate[0], lowerPlate[3], upperPlate[3], upperPlate[0]];
    let webPlateMeta = { part: gridkey, key: "webPlate", girder: point.girderNum, seg: point.segNum };
    let webPlateAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[centerPlate[0], centerPlate[3]]],
                sectionView: {
                    point: GetWeldingPoint([centerPlate[0], centerPlate[3]], 0.5),
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
                line: [[centerPlate[1], centerPlate[2]]],
                sectionView: {
                    point: GetWeldingPoint([centerPlate[1], centerPlate[2]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.upperThickness,
                line: [[centerPlate[2], centerPlate[3]]],
                sectionView: {
                    point: GetWeldingPoint([centerPlate[2], centerPlate[3]], 0.5),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.lowerThickness,
                line: [[centerPlate[0], centerPlate[1]]],
                sectionView: {
                    point: GetWeldingPoint([centerPlate[0], centerPlate[1]], 0.5),
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
        centerPlate,
        point,
        diaSection.webThickness,
        [0, 1, 2, 3],
        diaSection.scallopRadius,
        null,
        null,
        [],
        [2, 3],
        [0, 1, 2, 3],
        [0, 1],
        webPlateAdd,
        webPlateMeta
    );
    result["children"].push(webPlateModel);

    let stiffnerPoint = [
        [bl, lowerPlate[1]],
        [br, lowerPlate[2]],
        [tl, upperPlate[1]],
        [tr, upperPlate[2]],
    ];
    let isUpper = [false, false, true, true];
    let isRight = [true, false, true, false];
    for (let i = 0; i < 4; i++) {
        let stiffWidth = i % 2 === 0 ? diaSection.stiffWidth : -diaSection.stiffWidth;
        let tan1 = i < 2 ? 0 : gradient;
        let stiffner = GetPlateRestPoint(stiffnerPoint[i][0], stiffnerPoint[i][1], tan1, 0, stiffWidth);
        let side2D = i % 2 === 0 ? [0, 3, 2, 1] : null;
        let t2 = i < 2 ? sectionPoint.input.tlf : sectionPoint.input.tuf;
        let t3 = i < 2 ? diaSection.lowerThickness : diaSection.upperThickness;

        let stiffnerMeta = {
            part: gridkey,
            key: "stiffner" + i.toFixed(0),
            girder: point.girderNum,
            seg: point.segNum,
        };
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
                        isUpper: isUpper[i],
                        isRight: isRight[i],
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: t2,
                    line: [[stiffner[0], stiffner[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: t3,
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
            null,
            stiffnerMeta,
            stiffnerAdd
        );
        result["children"].push(stiffnerModel);
    }
    let data = [
        PointToGlobal({ x: (lowerPlate[0].x + upperPlate[0].x) / 2, y: (lowerPlate[0].y + upperPlate[0].y) / 2, z: 0 }, refPoint),
        PointToGlobal({ x: (lowerPlate[3].x + upperPlate[3].x) / 2, y: (lowerPlate[3].y + upperPlate[3].y) / 2, z: 0 }, refPoint),
    ];

    let section = [
        diaSection.lowerWidth,
        diaSection.lowerThickness,
        diaSection.upperWidth,
        diaSection.upperThickness,
        diaSection.upperHeight - diaSection.lowerHeight,
        diaSection.webThickness,
        diaSection.stiffThickness,
        diaSection.stiffWidth,
    ];

    let topLeftDimPoints = [
        uflangeModel["model"]["topView"][0],
        webPlateModel["model"]["topView"][0],
        webPlateModel["model"]["topView"][1],
        uflangeModel["model"]["topView"][1],
    ];

    let topRightDimPoints = [
        uflangeModel["model"]["topView"][3],
        webPlateModel["model"]["topView"][3],
        webPlateModel["model"]["topView"][2],
        uflangeModel["model"]["topView"][2],
    ];
    let bottomLeftDimPoints = [
        lflangeModel["model"]["bottomView"][0],
        webPlateModel["model"]["bottomView"][0],
        webPlateModel["model"]["bottomView"][1],
        lflangeModel["model"]["bottomView"][1],
    ];
    let bottomRightDimPoints = [
        lflangeModel["model"]["bottomView"][3],
        webPlateModel["model"]["bottomView"][3],
        webPlateModel["model"]["bottomView"][2],
        lflangeModel["model"]["bottomView"][2],
    ];

    let sectionLeftDimPoints = [upperPlate[0], upperPlate[1], lowerPlate[0], lowerPlate[1]];
    let sectionRightDimPoints = [upperPlate[2], upperPlate[3], lowerPlate[2], lowerPlate[3]];

    let fontSize = 14;
    let sd = GetSectionDimensionDict(sectionPoint);
    diaSection["totalHeight"] = diaHeight;
    let sectionID =
        sectionPoint.input.wuf.toFixed(0) +
        sectionPoint.input.wlf.toFixed(0) +
        sectionPoint.input.tlf.toFixed(0) +
        sectionPoint.input.tuf.toFixed(0) +
        sectionPoint.input.tw.toFixed(0);
    let parent = {
        part: gridkey,
        id:
            sectionID +
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        inode: gridkey + "L",
        jnode: gridkey + "R",
        key: gridkey + "X",
        isKframe: false,
        data: data,
        section: section,
        diaSection,
        properties: {},
        model: {
            sectionView: SectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                ToDimCont([sd.top[0], sd.top[sd.top.length - 1]], fontSize, "DIM", true, true, 0, sd.topIndex ? 0 : 1, 2),
                ToDimCont(sd.top, fontSize, "DIM", true, true, 0, sd.topIndex ? 0 : sd.top.length - 1, 1),
                ToDimCont([sd.bottom[0], sd.bottom[sd.bottom.length - 1]], fontSize, "DIM", true, false, 0, 0, 2),
                ToDimCont(sd.bottom, fontSize, "DIM", true, false, 0, 0, 1),
                ToDimCont(sd.left, fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont([...sd.left, ...sectionLeftDimPoints], fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont(sd.right, fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont([...sd.right, ...sectionRightDimPoints], fontSize, "DIM", false, true, 0, 0, 3),
            ],
            topView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, "DIM", false, true, 0, 0, 3),
            ],
            bottomView: [
                ToDimCont([bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]], fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont(bottomLeftDimPoints, fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont([bottomRightDimPoints[0], bottomRightDimPoints[bottomRightDimPoints.length - 1]], fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont(bottomRightDimPoints, fontSize, "DIM", false, true, 0, 0, 3),
            ],
        },
    };
    result["parent"].push(parent);
    return result;
}

function GenDiaphragm_BoxHole(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    let result = {
        parent: [],
        children: [],
    };

    let refPoint = GetRefPoint(point);
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
    let holeRect = [
        { x: diaSection.holeWidth / 2, y: bl.y + diaSection.holeBottomY },
        { x: -diaSection.holeWidth / 2, y: bl.y + diaSection.holeBottomY },
        { x: -diaSection.holeWidth / 2, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
        { x: diaSection.holeWidth / 2, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
    ];
    let holePoints = [];
    holePoints.push(...GetFilletPoints2D(holeRect[0], holeRect[1], holeRect[2], diaSection.holeFilletR, 4));
    holePoints.push(...GetFilletPoints2D(holeRect[1], holeRect[2], holeRect[3], diaSection.holeFilletR, 4));
    holePoints.push(...GetFilletPoints2D(holeRect[2], holeRect[3], holeRect[0], diaSection.holeFilletR, 4));
    holePoints.push(...GetFilletPoints2D(holeRect[3], holeRect[0], holeRect[1], diaSection.holeFilletR, 4));

    let mainPlateMeta = { part: gridkey, key: "mainPlate", girder: point.girderNum, seg: point.segNum };
    let mainPlateAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tuf,
                line: [[tl, tr]],
                sectionView: {
                    point: GetWeldingPoint([tl, tr], 0.1),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[bl, tl]],
                sectionView: {
                    point: GetWeldingPoint([bl, tl], 0.1),
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
                line: [[br, tr]],
                sectionView: {
                    point: GetWeldingPoint([br, tr], 0.7),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[bl, br]],
                sectionView: {
                    point: GetWeldingPoint([bl, br], 0.9),
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
    let mainPlateModel = GenVPlate(
        [bl, br, tr, tl],
        point,
        diaSection.webThickness,
        [0, 1, 2, 3],
        diaSection.scallopRadius,
        urib2,
        lrib2,
        holePoints,
        [2, 3],
        [0, 1, 2, 3],
        [0, 1],
        mainPlateMeta,
        mainPlateAdd
    );
    result["children"].push(mainPlateModel);

    let holeCenter1 = {
        x: 0,
        y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
    };
    let hstiff1 = [
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
    ];
    let hstiff2D1 = [
        {
            x: -diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        },
        {
            x: diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        },
        { x: diaSection.holeStiffhl / 2, y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin },
        { x: -diaSection.holeStiffhl / 2, y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin },
    ];

    let hstiff1Point = PointToGlobal(holeCenter1, refPoint);
    // let hstiff1CenterPoint = { ...hstiff1Point, normalCos: refPoint.normalCos, normalSin: refPoint.normalSin };
    let hstiff1CenterPoint = { ...refPoint, x: hstiff1Point.x, y: hstiff1Point.y, z: hstiff1Point.z };
    let hstiff1Meta = { part: gridkey, key: "hstiff1", girder: point.girderNum, seg: point.segNum };
    let hstiff1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[hstiff1[0], hstiff1[1]]],
                sectionView: {
                    point: holeCenter1,
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let hstiff1Model = GenHPlate(
        hstiff1,
        hstiff1CenterPoint,
        diaSection.holeStiffThickness,
        0,
        point.skew,
        0,
        0,
        hstiff2D1,
        false,
        [1, 2],
        true,
        null,
        hstiff1Meta,
        hstiff1Add
    );
    result["children"].push(hstiff1Model);

    let holeCenter2 = { x: 0, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin };
    let hstiff2D2 = [
        {
            x: -diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
        },
        {
            x: diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
        },
        {
            x: diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin,
        },
        {
            x: -diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin,
        },
    ];

    let hstiff2Point = PointToGlobal(holeCenter2, refPoint);
    // let hsttif2CenterPoint = { ...hstiff2Point, normalCos: refPoint.normalCos, normalSin: refPoint.normalSin };
    let hsttif2CenterPoint = { ...refPoint, x: hstiff2Point.x, y: hstiff2Point.y, z: hstiff2Point.z };
    let hstiff2Meta = { part: gridkey, key: "hstiff2", girder: point.girderNum, seg: point.segNum };
    let hstiff2Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[hstiff1[0], hstiff1[1]]],
                sectionView: {
                    point: holeCenter2,
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
    let hstiff2Model = GenHPlate(
        hstiff1,
        hsttif2CenterPoint,
        diaSection.holeStiffThickness,
        0,
        point.skew,
        0,
        0,
        hstiff2D2,
        true,
        [1, 2],
        false,
        null,
        hstiff2Meta,
        hstiff2Add
    );
    result["children"].push(hstiff2Model);

    let holeCenter3 = {
        x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };
    let vstiff1 = [
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
    ];
    let vstiff2D1 = [
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
    ];

    let v1Point = PointToGlobal(holeCenter3, refPoint);
    // let vstiff1CenterPoint = { ...v1Point, normalCos: refPoint.normalCos, normalSin: refPoint.normalSin }
    let vstiff1CenterPoint = { ...refPoint, x: v1Point.x, y: v1Point.y, z: v1Point.z };

    let vstiff1Meta = { part: gridkey, key: "vstiff1", girder: point.girderNum, seg: point.segNum };
    let vstiff1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[vstiff1[0], vstiff1[1]]],
                sectionView: {
                    point: holeCenter3,
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
    let vstiff1Model = GenHPlate(
        vstiff1,
        vstiff1CenterPoint,
        diaSection.holeStiffThickness,
        0,
        point.skew,
        0,
        Math.PI / 2,
        vstiff2D1,
        true,
        [0, 1],
        true,
        null,
        vstiff1Meta,
        vstiff1Add
    );
    result["children"].push(vstiff1Model);

    let holeCenter4 = {
        x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };
    let vstiff2D2 = [
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
    ];

    let v2Point = PointToGlobal(holeCenter4, refPoint);
    let vstiff2CenterPoint = { ...refPoint, x: v2Point.x, y: v2Point.y, z: v2Point.z };
    let vstiff2Meta = { part: gridkey, key: "vstiff2", girder: point.girderNum, seg: point.segNum };
    let vstiff2Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[vstiff1[0], vstiff1[1]]],
                sectionView: {
                    point: holeCenter4,
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
    let vstiff2Model = GenHPlate(
        vstiff1,
        vstiff2CenterPoint,
        diaSection.holeStiffThickness,
        0,
        point.skew,
        0,
        Math.PI / 2,
        vstiff2D2,
        true,
        null,
        true,
        null,
        vstiff2Meta,
        vstiff2Add
    );
    result["children"].push(vstiff2Model);

    let hStiffCenter = { x: 0, y: bl.y + diaSection.hstiffHeight };
    let h1 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: -diaSection.hstiffWidth - diaSection.webThickness / 2 },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: -diaSection.holeStiffHeight - diaSection.webThickness / 2,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: -diaSection.webThickness / 2,
        },
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: -diaSection.webThickness / 2 },
    ];
    let h2D1 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: bl.y + diaSection.hstiffHeight },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.hstiffHeight,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness,
        },
        {
            x: bl.x + lwCot * (diaSection.hstiffHeight + diaSection.hstiffThickness),
            y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness,
        },
    ];

    let h1Point = PointToGlobal(hStiffCenter, refPoint);
    let h1CenterPoint = { ...refPoint, x: h1Point.x, y: h1Point.y, z: h1Point.z };
    let h1Meta = { part: gridkey, key: "h1", girder: point.girderNum, seg: point.segNum };
    let h1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.hstiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[h1[3], h1[0], h1[1], h1[2]]],
                sectionView: {
                    point: GetWeldingPoint([h2D1[0], h2D1[1]], 0.5),
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
    let h1Model = GenHPlate(h1, h1CenterPoint, diaSection.hstiffThickness, 0, point.skew, 0, 0, h2D1, true, null, true, null, h1Meta, h1Add);
    result["children"].push(h1Model);

    let h2 = [
        { x: br.x + rwCot * diaSection.hstiffHeight, y: -diaSection.hstiffWidth - diaSection.webThickness / 2 },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: -diaSection.holeStiffHeight - diaSection.webThickness / 2,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: -diaSection.webThickness / 2,
        },
        { x: br.x + rwCot * diaSection.hstiffHeight, y: -diaSection.webThickness / 2 },
    ];
    let h2D2 = [
        { x: br.x + rwCot * diaSection.hstiffHeight, y: bl.y + diaSection.hstiffHeight },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.hstiffHeight,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness,
        },
        {
            x: br.x + rwCot * (diaSection.hstiffHeight + diaSection.hstiffThickness),
            y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness,
        },
    ];

    let h2Point = PointToGlobal(hStiffCenter, refPoint);
    let h2Meta = { part: gridkey, key: "h2", girder: point.girderNum, seg: point.segNum };
    let h2Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.hstiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[h2[3], h2[0], h2[1], h2[2]]],
                sectionView: {
                    point: GetWeldingPoint([h2D2[0], h2D2[1]], 0.5),
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
    let h2CenterPoint = { ...refPoint, x: h2Point.x, y: h2Point.y, z: h2Point.z };
    let h2Model = GenHPlate(h2, h2CenterPoint, diaSection.hstiffThickness, 0, point.skew, 0, 0, h2D2, true, null, true, null, h2Meta, h2Add);
    result["children"].push(h2Model);

    let h3 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: diaSection.hstiffWidth + diaSection.webThickness / 2 },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: diaSection.holeStiffHeight + diaSection.webThickness / 2,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: diaSection.webThickness / 2,
        },
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: diaSection.webThickness / 2 },
    ];

    let h3Point = PointToGlobal(hStiffCenter, refPoint);
    let h3CenterPoint = { ...refPoint, x: h3Point.x, y: h3Point.y, z: h3Point.z };
    let h3Meta = { part: gridkey, key: "h3", girder: point.girderNum, seg: point.segNum };
    let h3Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.hstiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[h3[3], h3[0], h3[1], h3[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let h3Model = GenHPlate(h3, h3CenterPoint, diaSection.hstiffThickness, 0, point.skew, 0, 0, [], true, null, true, null, h3Meta, h3Add);
    result["children"].push(h3Model);

    let h4 = [
        { x: br.x + rwCot * diaSection.hstiffHeight, y: diaSection.hstiffWidth + diaSection.webThickness / 2 },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: diaSection.holeStiffHeight + diaSection.webThickness / 2,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: diaSection.webThickness / 2,
        },
        { x: br.x + rwCot * diaSection.hstiffHeight, y: diaSection.webThickness / 2 },
    ];

    let h4Point = PointToGlobal(hStiffCenter, refPoint);
    let h4CenterPoint = { ...refPoint, x: h4Point.x, y: h4Point.y, z: h4Point.z };
    let h4Meta = { part: gridkey, key: "h4", girder: point.girderNum, seg: point.segNum };
    let h4Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.hstiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[h3[3], h3[0], h3[1], h3[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let h4Model = GenHPlate(h4, h4CenterPoint, diaSection.hstiffThickness, 0, point.skew, 0, 0, [], true, null, true, null, h4Meta, h4Add);
    result["children"].push(h4Model);

    let hPlateModel = [h1Model, h3Model, h2Model, h4Model];
    let topLeftDimPoints = [
        hPlateModel[0]["model"]["topView"][0],
        hPlateModel[0]["model"]["topView"][1],
        hPlateModel[0]["model"]["topView"][2],
        hPlateModel[1]["model"]["topView"][2],
        hPlateModel[1]["model"]["topView"][1],
        hPlateModel[1]["model"]["topView"][0],
    ];
    let topRightDimPoints = [
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][0],
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][1],
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][2],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][2],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][1],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][0],
    ];
    let sectionLeftDimPoints = [holeRect[1], holeRect[2]];
    let sectionRightDimPoints = [
        { x: h2D2[1].x, y: hStiffCenter.y },
        { x: h2D2[1].x, y: hStiffCenter.y + diaSection.hstiffThickness },
    ];
    let sd = GetSectionDimensionDict(sectionPoint);
    diaSection["totalHeight"] = diaHeight;
    let sectionID =
        sectionPoint.input.wuf.toFixed(0) +
        sectionPoint.input.wlf.toFixed(0) +
        sectionPoint.input.tlf.toFixed(0) +
        sectionPoint.input.tuf.toFixed(0) +
        sectionPoint.input.tw.toFixed(0);

    let fontSize = 14;
    let parent = {
        part: gridkey,
        id:
            sectionID +
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        diaSection,
        properties: {
            Tdia: diaSection.webThickness,
            hole: {
                H: diaSection.holeHeight,
                B: diaSection.holeWidth,
                H1: diaHeight - (diaSection.holeBottomY + diaSection.holeHeight),
                H2: diaSection.holeBottomY,
                e: 0, //diaSection.holeCenterOffset>0? diaSection.holeCenterOffset - diaSection.holeWidth/2 : diaSection.holeCenterOffset + diaSection.holeWidth/2,
            },
        },
        model: {
            sectionView: SectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                ToDimCont([sd.top[0], sd.top[sd.top.length - 1]], fontSize, "DIM", true, true, 0, sd.topIndex ? 0 : 1, 2),
                ToDimCont(sd.top, fontSize, "DIM", true, true, 0, sd.topIndex ? 0 : sd.top.length - 1, 1),
                ToDimCont([sd.bottom[0], sd.bottom[sd.bottom.length - 1]], fontSize, "DIM", true, false, 0, 0, 2),
                ToDimCont(sd.bottom, fontSize, "DIM", true, false, 0, 0, 1),
                ToDimCont(sd.left, fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont([...sd.left, ...sectionLeftDimPoints], fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont(sd.right, fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont([...sd.right, ...sectionRightDimPoints], fontSize, "DIM", false, true, 0, 0, 3),
            ],
            topView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, "DIM", false, true, 0, 0, 3),
            ],
            bottomView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, "DIM", false, true, 0, 0, 3),
            ],
        },
    };
    result["parent"].push(parent);

    return result;
}

function GenDiaphragm_BoxSupport(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    // } //  임시 입력변수
    let refPoint = GetRefPoint(point);
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

    let result = {
        parent: [],
        children: [],
    };
    let holeRect = [
        { x: diaSection.holeWidth / 2 + diaSection.holeCenterOffset, y: bl.y + diaSection.holeBottomY },
        { x: -diaSection.holeWidth / 2 + diaSection.holeCenterOffset, y: bl.y + diaSection.holeBottomY },
        {
            x: -diaSection.holeWidth / 2 + diaSection.holeCenterOffset,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeCenterOffset,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight,
        },
    ];
    let holePoints = [];
    holePoints.push(...GetFilletPoints2D(holeRect[0], holeRect[1], holeRect[2], diaSection.holeFilletR, 4));
    holePoints.push(...GetFilletPoints2D(holeRect[1], holeRect[2], holeRect[3], diaSection.holeFilletR, 4));
    holePoints.push(...GetFilletPoints2D(holeRect[2], holeRect[3], holeRect[0], diaSection.holeFilletR, 4));
    holePoints.push(...GetFilletPoints2D(holeRect[3], holeRect[0], holeRect[1], diaSection.holeFilletR, 4));

    let mainPlateMeta = { part: gridkey, key: "mainPlate", girder: point.girderNum, seg: point.segNum };
    let mainPlateAdd = {
        properties: {
            thickness: diaSection.webThickness,
        },
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tuf,
                line: [[tl, tr]],
                sectionView: {
                    point: GetWeldingPoint([tl, tr], 0.1),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[bl, tl]],
                sectionView: {
                    point: GetWeldingPoint([bl, tl], 0.1),
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
                line: [[br, tr]],
                sectionView: {
                    point: GetWeldingPoint([br, tr], 0.7),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[bl, br]],
                sectionView: {
                    point: GetWeldingPoint([bl, br], 0.9),
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
    let mainPlateModel = GenVPlate(
        [bl, br, tr, tl],
        point,
        diaSection.webThickness,
        [0, 1, 2, 3],
        diaSection.scallopRadius,
        urib2,
        lrib2,
        holePoints,
        [2, 3],
        [0, 1, 2, 3],
        [0, 1],
        mainPlateMeta,
        mainPlateAdd
    );
    result["children"].push(mainPlateModel);

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
    let hstiff2D1 = [
        {
            x: diaSection.holeCenterOffset - diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        },
        {
            x: diaSection.holeCenterOffset + diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        },
        {
            x: diaSection.holeCenterOffset + diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin,
        },
        {
            x: diaSection.holeCenterOffset - diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin,
        },
    ];
    let hstiff1Point = PointToGlobal(holeCenter1, refPoint);
    let hstiff1CenterPoint = { ...refPoint, x: hstiff1Point.x, y: hstiff1Point.y, z: hstiff1Point.z };

    let hstiff1Meta = { part: gridkey, key: "hstiff1", girder: point.girderNum, seg: point.segNum };
    let hstiff1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[hstiff1[0], hstiff1[1]]],
                sectionView: {
                    point: holeCenter1,
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    };

    let hstiff1Model = GenHPlate(
        hstiff1,
        hstiff1CenterPoint,
        diaSection.holeStiffThickness,
        0,
        point.skew,
        0,
        0,
        hstiff2D1,
        false,
        [1, 2],
        true,
        null,
        hstiff1Meta,
        hstiff1Add
    );
    result["children"].push(hstiff1Model);

    let holeCenter2 = {
        x: diaSection.holeCenterOffset,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin,
    };
    let hstiff2D2 = [
        {
            x: diaSection.holeCenterOffset - diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
        },
        {
            x: diaSection.holeCenterOffset + diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
        },
        {
            x: diaSection.holeCenterOffset + diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin,
        },
        {
            x: diaSection.holeCenterOffset - diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin,
        },
    ];

    let hstiff2Point = PointToGlobal(holeCenter2, refPoint);
    let hstiff2CenterPoint = { ...refPoint, x: hstiff2Point.x, y: hstiff2Point.y, z: hstiff2Point.z };
    let hstiff2Meta = { part: gridkey, key: "hstiff2", girder: point.girderNum, seg: point.segNum };
    let hstiff2Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[hstiff1[0], hstiff1[1]]],
                sectionView: {
                    point: holeCenter2,
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
    let hstiff2Model = GenHPlate(
        hstiff1,
        hstiff2CenterPoint,
        diaSection.holeStiffThickness,
        0,
        point.skew,
        0,
        0,
        hstiff2D2,
        true,
        [1, 2],
        false,
        null,
        hstiff2Meta,
        hstiff2Add
    );
    result["children"].push(hstiff2Model);

    let holeCenter3 = {
        x: diaSection.holeCenterOffset - diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };
    let vstiff1 = [
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
    ];
    let vstiff2D1 = [
        {
            x: diaSection.holeCenterOffset - diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeCenterOffset - diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeCenterOffset - diaSection.holeWidth / 2 - diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeCenterOffset - diaSection.holeWidth / 2 - diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
    ];

    let vstiff1Point = PointToGlobal(holeCenter3, refPoint);
    let vstiff1CenterPoint = { ...refPoint, x: vstiff1Point.x, y: vstiff1Point.y, z: vstiff1Point.z };
    let vstiff1Meta = { part: gridkey, key: "vstiff1", girder: point.girderNum, seg: point.segNum };
    let vstiff1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[vstiff1[0], vstiff1[1]]],
                sectionView: {
                    point: holeCenter3,
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
    let vstiff1Model = GenHPlate(
        vstiff1,
        vstiff1CenterPoint,
        diaSection.holeStiffThickness,
        0,
        point.skew,
        0,
        Math.PI / 2,
        vstiff2D1,
        true,
        [1, 2],
        true,
        null,
        vstiff1Meta,
        vstiff1Add
    );
    result["children"].push(vstiff1Model);

    let holeCenter4 = {
        x: diaSection.holeCenterOffset + diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };
    let vstiff2D2 = [
        {
            x: diaSection.holeCenterOffset + diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeCenterOffset + diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeCenterOffset + diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeCenterOffset + diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
    ];

    let vstiff2Point = PointToGlobal(holeCenter4, refPoint);
    let vstiff2CenterPoint = { ...refPoint, x: vstiff2Point.x, y: vstiff2Point.y, z: vstiff2Point.z };
    let vstiff2Meta = { part: gridkey, key: "vstiff2", girder: point.girderNum, seg: point.segNum };
    let vstiff2Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[vstiff1[0], vstiff1[1]]],
                sectionView: {
                    point: holeCenter4,
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
    let vstiff2Model = GenHPlate(
        vstiff1,
        vstiff2CenterPoint,
        diaSection.holeStiffThickness,
        0,
        point.skew,
        0,
        Math.PI / 2,
        vstiff2D2,
        true,
        null,
        true,
        null,
        vstiff2Meta,
        vstiff2Add
    );
    result["children"].push(vstiff2Model);

    let supportStiffModel = [];
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
        let supportStiff2D = [
            {
                x: supportStiffLayout[i] - diaSection.supportStiffThickness / 2,
                y: tl.y + gradient * (supportStiffLayout[i] - diaSection.supportStiffThickness / 2 - tl.x),
            },
            { x: supportStiffLayout[i] - diaSection.supportStiffThickness / 2, y: bl.y },
            { x: supportStiffLayout[i] + diaSection.supportStiffThickness / 2, y: bl.y },
            {
                x: supportStiffLayout[i] + diaSection.supportStiffThickness / 2,
                y: tl.y + gradient * (supportStiffLayout[i] + diaSection.supportStiffThickness / 2 - tl.x),
            },
        ];

        let spStiffPoint = PointToGlobal(supportStiffCenter1, refPoint);
        let spStiffCenterPoint = { ...refPoint, x: spStiffPoint.x, y: spStiffPoint.y, z: spStiffPoint.z };
        let weldView =
            i === "0"
                ? {
                      topView: {
                          point: spStiffPoint,
                          isUpper: true,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  }
                : {};
        let supportStiff1Meta = { part: gridkey, key: "supportStiff1" + i, girder: point.girderNum, seg: point.segNum };
        let supportStiff1Add = {
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.supportStiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[supportStiff1[0], supportStiff1[1]]],
                    ...weldView,
                },
                {
                    type: "FF",
                    thickness1: diaSection.supportStiffThickness,
                    thickness2: sectionPoint.input.tuf,
                    line: [[supportStiff1[0], supportStiff1[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.supportStiffThickness,
                    thickness2: sectionPoint.input.tlf,
                    line: [[supportStiff1[1], supportStiff1[2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        };
        let supportStiff1Model = GenHPlate(
            supportStiff1,
            spStiffCenterPoint,
            diaSection.supportStiffThickness,
            -diaSection.supportStiffThickness / 2,
            point.skew,
            0,
            Math.PI / 2,
            supportStiff2D,
            true,
            null,
            true,
            null,
            supportStiff1Meta,
            supportStiff1Add
        );
        result["children"].push(supportStiff1Model);

        let supportStiff2Meta = { part: gridkey, key: "supportStiff2" + i, girder: point.girderNum, seg: point.segNum };
        let supportStiff2Add = {
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.supportStiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[supportStiff1[0], supportStiff1[1]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.supportStiffThickness,
                    thickness2: sectionPoint.input.tuf,
                    line: [[supportStiff1[0], supportStiff1[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.supportStiffThickness,
                    thickness2: sectionPoint.input.tlf,
                    line: [[supportStiff1[1], supportStiff1[2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        };
        let supportStiff2Model = GenHPlate(
            supportStiff2,
            spStiffCenterPoint,
            diaSection.supportStiffThickness,
            -diaSection.supportStiffThickness / 2,
            point.skew,
            0,
            Math.PI / 2,
            null,
            true,
            null,
            true,
            null,
            supportStiff2Meta,
            supportStiff2Add
        );
        result["children"].push(supportStiff2Model);

        supportStiffModel.push(supportStiff1Model, supportStiff2Model);
    }

    let hStiffCenter = { x: 0, y: bl.y + diaSection.hstiffHeight };
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
            { x: hx[i * 2][0], y: -(hx[i * 2][1] - 10) },
            { x: hx[i * 2][0] + 10, y: -hx[i * 2][1] },
            { x: hx[i * 2 + 1][0] - 10, y: -hx[i * 2 + 1][1] },
            { x: hx[i * 2 + 1][0], y: -(hx[i * 2 + 1][1] - 10) },
            { x: hx[i * 2 + 1][0], y: -(w0 + 10) },
            { x: hx[i * 2 + 1][0] - 10, y: -w0 },
            { x: hx[i * 2][0] + 10, y: -w0 },
            { x: hx[i * 2][0], y: -(w0 + 10) },
        ]);
        h3.push([
            { x: hx[i * 2][0], y: hx[i * 2][1] - 10 },
            { x: hx[i * 2][0] + 10, y: hx[i * 2][1] },
            { x: hx[i * 2 + 1][0] - 10, y: hx[i * 2 + 1][1] },
            { x: hx[i * 2 + 1][0], y: hx[i * 2 + 1][1] - 10 },
            { x: hx[i * 2 + 1][0], y: w0 + 10 },
            { x: hx[i * 2 + 1][0] - 10, y: w0 },
            { x: hx[i * 2][0] + 10, y: w0 },
            { x: hx[i * 2][0], y: w0 + 10 },
        ]);
    }

    let cpt = PointToGlobal(hStiffCenter, refPoint);
    let hPlateModel = [];
    for (let i = 0; i < hx.length / 2; i++) {
        let h2D = [
            { x: hx[i * 2][0], y: hStiffCenter.y },
            { x: hx[i * 2 + 1][0], y: hStiffCenter.y },
            { x: hx[i * 2 + 1][0], y: hStiffCenter.y + diaSection.hstiffThickness },
            { x: hx[i * 2][0], y: hStiffCenter.y + diaSection.hstiffThickness },
        ];
        let weldingView =
            i % 2 === 0
                ? {
                      sectionView: {
                          point: GetWeldingPoint([h2D[0], h2D[1]], 0.5),
                          isUpper: true,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  }
                : {
                      sectionView: {
                          point: GetWeldingPoint([h2D[2], h2D[3]], 0.5),
                          isUpper: false,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  };

        let hCenterPoint = { ...refPoint, x: cpt.x, y: cpt.y, z: cpt.z };
        let h2Meta = { part: gridkey, key: "h2" + i, girder: point.girderNum, seg: point.segNum };
        let h2Add = {
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.hstiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[h2[i][3], h2[i][0], h2[i][1], h2[i][2]]],
                    ...weldingView,
                },
            ],
            textLabel: {},
            dimension: {},
        };
        let h2Model = GenHPlate(h2[i], hCenterPoint, diaSection.hstiffThickness, 0, point.skew, 0, 0, h2D, true, null, true, null, h2Meta, h2Add);
        result["children"].push(h2Model);

        let h3Meta = { part: gridkey, key: "h3" + i, girder: point.girderNum, seg: point.segNum };
        let h3Add = {
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.hstiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[h3[i][3], h3[i][0], h3[i][1], h3[i][2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        };
        let h3Model = GenHPlate(h3[i], hCenterPoint, diaSection.hstiffThickness, 0, point.skew, 0, 0, null, true, null, true, null, h3Meta, h3Add);
        hPlateModel.push(h2Model, h3Model);
        result["children"].push(h3Model);
    }

    let topLeftDimPoints = [
        hPlateModel[0]["model"]["topView"][0],
        hPlateModel[0]["model"]["topView"][1],
        hPlateModel[0]["model"]["topView"][2],
        hPlateModel[1]["model"]["topView"][2],
        hPlateModel[1]["model"]["topView"][1],
        hPlateModel[1]["model"]["topView"][0],
    ];
    let topRightDimPoints = [
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][2],
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][3],
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][4],
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][5],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][5],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][4],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][3],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][2],
    ];

    let topSupportDimPoints = [
        supportStiffModel[supportStiffModel.length - 1]["model"]["topView"][0],
        supportStiffModel[supportStiffModel.length - 1]["model"]["topView"][3],
        supportStiffModel[supportStiffModel.length - 2]["model"]["topView"][3],
        supportStiffModel[supportStiffModel.length - 2]["model"]["topView"][0],
    ];
    let topSupportDimPoints2 = [];
    for (let i = 0; i < supportStiffModel.length; i += 2) {
        topSupportDimPoints2.push(supportStiffModel[i]["model"]["topView"][2], supportStiffModel[i]["model"]["topView"][3]);
    }
    let bottomSupportDimPoints = [
        supportStiffModel[supportStiffModel.length - 1]["model"]["topView"][1],
        supportStiffModel[supportStiffModel.length - 1]["model"]["topView"][2],
        supportStiffModel[supportStiffModel.length - 2]["model"]["topView"][2],
        supportStiffModel[supportStiffModel.length - 2]["model"]["topView"][1],
    ];

    let sectionLeftDimPoints = [holeRect[1], holeRect[2]];
    let sectionRightDimPoints = [
        { x: h2[h2.length - 1][1].x, y: hStiffCenter.y },
        { x: h2[h2.length - 1][1].x, y: hStiffCenter.y + diaSection.hstiffThickness },
    ];

    let sd = GetSectionDimensionDict(sectionPoint);
    diaSection["totalHeight"] = diaHeight;

    let fontSize = 14;
    let parent = {
        part: gridkey,
        id:
            sectionID +
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        diaSection,
        properties: {
            Tdia: diaSection.webThickness,
            hole: {
                H: diaSection.holeHeight,
                B: diaSection.holeWidth,
                H1: diaHeight - (diaSection.holeBottomY + diaSection.holeHeight),
                H2: diaSection.holeBottomY,
                e:
                    diaSection.holeCenterOffset > 0
                        ? diaSection.holeCenterOffset - diaSection.holeWidth / 2
                        : diaSection.holeCenterOffset + diaSection.holeWidth / 2,
            },
            stiffs: {
                B: diaSection.supportStiffWidth * 2, //앞뒤로 두개가 있는 경우 반영
                H: diaHeight,
                T: diaSection.supportStiffThickness,
                S: 200, //임시로 지정
                n: supportStiffLayout.length,
                alpha: point.skew,
            },
        },
        model: {
            sectionView: SectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                ToDimCont([sd.top[0], sd.top[sd.top.length - 1]], fontSize, "DIM", true, true, 0, sd.topIndex ? 0 : 1, 2),
                ToDimCont(sd.top, fontSize, "DIM", true, true, 0, sd.topIndex ? 0 : sd.top.length - 1, 1),
                ToDimCont([sd.bottom[0], sd.bottom[sd.bottom.length - 1]], fontSize, "DIM", true, false, 0, 0, 2),
                ToDimCont(sd.bottom, fontSize, "DIM", true, false, 0, 0, 1),
                ToDimCont(sd.left, fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont([...sd.left, ...sectionLeftDimPoints], fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont(sd.right, fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont([...sd.right, ...sectionRightDimPoints], fontSize, "DIM", false, true, 0, 0, 3),
            ],
            topView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, "DIM", false, true, 0, 0, 3),
                ToDimCont(topSupportDimPoints, fontSize, "DIM", false, true, 0, 0, 1),
                ToDimCont(topSupportDimPoints2, fontSize, "DIM", true, true, 0, 0, 0),
            ],
            bottomView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, "DIM", false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, "DIM", false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, "DIM", false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, "DIM", false, true, 0, 0, 3),
                ToDimCont(bottomSupportDimPoints, fontSize, "DIM", false, true, 0, 0, 1),
                ToDimCont(topSupportDimPoints2, fontSize, "DIM", true, true, 0, 0, 0),
            ],
        },
    };
    result["parent"].push(parent);
    return result;
}
