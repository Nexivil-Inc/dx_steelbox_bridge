import { GetFilletPoints2D, GetRefPoint, PointToGlobal, PointToLocal, RefPoint } from "@nexivil/package-modules";
import { ToDimCont } from "@nexivil/package-modules/src/temp";
import { LatheBufferGeometry } from "three";
import { plateSectionRef } from "../reference/plate";
import { GenIBeamJointDict } from "./splice";
import { GenHPlate, GenHPlateSide, GenVPlate, GetPlateRestPoint, GetWeldingPoint, scallop } from "./utils";

export function GenXBeamModelFn(gridPoint, sectionPointDict, xbeamLayout, xbeamSectionList) {
    const iNode = 0;
    const jNode = 1;
    const section = 2;

    let result = { parent: [], children: [] };
    let xbeamData = [];
    for (let i = 0; i < xbeamLayout.length; i++) {
        let iNodekey = xbeamLayout[i][iNode];
        let jNodekey = xbeamLayout[i][jNode];
        let xbeamSectionName = xbeamLayout[i][section];
        let xbeamSection = xbeamSectionList[xbeamSectionName];

        let iSectionPoint = sectionPointDict[iNodekey].forward;
        let jSectionPoint = sectionPointDict[jNodekey].forward;
        let iRefPt = GetRefPoint(gridPoint[iNodekey]);
        let jRefPt = GetRefPoint(gridPoint[jNodekey]);

        let xbData = [];
        let xbSection = [];
        let iRight = PointToGlobal({ x: iSectionPoint.input.B2 / 2, y: 0 }, iRefPt);
        let jLeft = PointToGlobal({ x: -jSectionPoint.input.B2 / 2, y: 0 }, jRefPt);
        let iPoint = { ...iRefPt, ...iRight };
        let jPoint = { ...jRefPt, ...jLeft };

        let sectionID =
            iSectionPoint.input.wuf.toFixed(0) +
            iSectionPoint.input.wlf.toFixed(0) +
            iSectionPoint.input.tlf.toFixed(0) +
            iSectionPoint.input.tuf.toFixed(0) +
            iSectionPoint.input.tw.toFixed(0) +
            jSectionPoint.input.wuf.toFixed(0) +
            jSectionPoint.input.wlf.toFixed(0) +
            jSectionPoint.input.tlf.toFixed(0) +
            jSectionPoint.input.tuf.toFixed(0) +
            jSectionPoint.input.tw.toFixed(0);

        if (xbeamFnMap[xbeamSectionName]) {
            // if (xbeamFnMap[xbeamSectionName] && ["플레이트-중"].includes(xbeamSectionName)) {
            let xbeam = xbeamFnMap[xbeamSectionName](
                iPoint,
                jPoint,
                iSectionPoint,
                jSectionPoint,
                xbeamSection,
                iNodekey,
                jNodekey,
                xbeamSectionName,
                plateSectionRef
            );

            result["children"].push(...xbeam.children);
            let skewID = String(Math.round(xbeam.parent[0].point.skew));
            xbeam.parent[0].id = skewID + sectionID + xbeam.parent[0].id;
            result["parent"].push(...xbeam.parent);

            if (xbeam["parent"][0].data && xbeam["parent"][0].section) {
                xbData = xbeam["parent"][0].data;
                xbSection = xbeam["parent"][0].section;
            }
            let key = i < 10 ? "X0" + i : "X" + i;
            let isKframe = xbeamLayout[i][section].includes("K형") ? true : false;
            xbeamData.push({
                inode: iNodekey,
                jnode: jNodekey,
                key: key,
                isKframe: isKframe,
                data: xbData,
                section: xbSection,
            });
        }
    }
    return { model: result, xbeamData };
}

const xbeamFnMap = {
    I형: function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return XbeamI0(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    K형: function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return XbeamK0(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB);
    },
    "플레이트-상": function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return DYXbeam1V2(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    박스부: function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return GenXBeam_Box(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    박스부2: function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return GenXBeam_Box(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    "플레이트-하": function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return GenXBeam_PlateBottom(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
    "플레이트-중": function (iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName, sectionDB) {
        return GenXBeam_PlateCenter(iPoint, jPoint, iSectionPoint, jSectionPoint, xbeamSection, iNodekey, jNodekey, xbeamSectionName);
    },
};

function GenXBeam_Box(iPoint, jPoint, iSectionPoint, jSectionPoint, xs, iNodekey, jNodekey, xbeamSectionName) {
    const fontSize = 14;
    const layer = "DIM";

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
    let tlength = Math.sqrt((iPoint.x - jPoint.x) ** 2 + (iPoint.y - jPoint.y) ** 2);
    let vec = { x: (jPoint.x - iPoint.x) / tlength, y: (jPoint.y - iPoint.y) / tlength };
    let dOffset = (jPoint.offset - iPoint.offset) / 2;
    let dz = (jPoint.z - iPoint.z) / 2;

    let centerPoint = {
        x: (iPoint.x + jPoint.x) / 2,
        y: (iPoint.y + jPoint.y) / 2,
        z: (iPoint.z + jPoint.z) / 2,
        normalCos: iPoint.normalCos,
        normalSin: iPoint.normalSin,
        offset: (iPoint.offset + jPoint.offset) / 2,
    };
    let cw = centerPoint.normalCos * vec.y - centerPoint.normalSin * vec.x > 0 ? 1 : -1; // 반시계방향의 경우 1
    let dotVec = (centerPoint.normalCos * vec.x + centerPoint.normalSin * vec.y).toFixed(4) * 1;
    let rad = cw * Math.acos(dotVec);
    // centerPoint.skew = Math.PI / 2 + cw * Math.acos(dotVec);
    centerPoint.skew = cw * Math.acos(dotVec);
    let refCenterPoint = GetRefPoint(centerPoint);

    const rightAngle = Math.PI / 2;
    // const rightAngle = 0;

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
    let partKey = iNodekey + jNodekey;

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

    let webBracketMeta = { part: partKey, key: "webBracket" };
    let stiffnerMeta = { part: partKey, key: "stiffner" };
    let flangeBracketMeta = { part: partKey, key: "flangeBracket" };

    let webBracket0Meta = { part: partKey, key: "webBracket0" };
    let webBracket0Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: iSectionPoint.input.tw,
                line: [[lwebPlate[0], lwebPlate[1]]],
                sectionView: {
                    point: GetWeldingPoint([lwebPlate[0], lwebPlate[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: xs.flangeThickness,
                line: [[lwebPlate[1], lwebPlate[2]]],
                topView: {
                    point: GetWeldingPoint([PointToGlobal(lwebPlate[1], refCenterPoint), PointToGlobal(lwebPlate[2], refCenterPoint)], 0.5),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: iSectionPoint.input.tuf,
                line: [[lwebPlate[0], lwebPlate[3]]],
                bottomView: {
                    point: GetWeldingPoint([PointToGlobal(lwebPlate[0], refCenterPoint), PointToGlobal(lwebPlate[3], refCenterPoint)], 0.5),
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

    let webBracket0Model = GenVPlate(
        lwebPlate,
        centerPoint,
        xs.webThickness,
        [],
        0,
        null,
        null,
        [],
        [0, 3],
        null,
        [1, 2],
        webBracketMeta,
        webBracket0Add
    );
    result["children"].push(webBracket0Model);

    let lstiff = [
        { x: tl.x, y: tl.y - xs.webHeight - xs.flangeThickness },
        bl,
        { x: bl.x + xs.stiffWidth, y: bl.y },
        { x: tl.x + xs.bracketLength, y: tl.y - xs.webHeight - xs.flangeThickness + lGradient * xs.bracketLength - 30 },
        { x: tl.x + xs.bracketLength, y: tl.y - xs.webHeight - xs.flangeThickness + lGradient * xs.bracketLength },
    ];

    let stiffner0Meta = { part: partKey, key: "stiffner0" };
    let stiffner0Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: iSectionPoint.input.tw,
                line: [[lstiff[0], lstiff[1]]],
                sectionView: {
                    point: GetWeldingPoint([lstiff[0], lstiff[1]], 0.5),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: xs.flangeThickness,
                line: [[lstiff[0], lstiff[4]]],
            },
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: iSectionPoint.input.tlf,
                line: [[lstiff[1], lstiff[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let stiffner0Model = GenVPlate(
        lstiff,
        centerPoint,
        xs.stiffThickness,
        [0, 1],
        xs.scallopRadius,
        null,
        null,
        [],
        null,
        null,
        null,
        stiffnerMeta,
        stiffner0Add
    );
    result["children"].push(stiffner0Model);

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
    let ref_cp = refCenterPoint;
    let gcp = PointToGlobal(cp, ref_cp);
    let lPlateSection = GenHPlateSide(-lL / 2, lL / 2, 12, -12, cp, lrot, rightAngle, rightAngle);
    // let leftCp = { ...gcp, normalCos: vec.x, normalSin: vec.y };
    let leftMeta = { part: partKey, key: "lstiffPlate" };
    let leftAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: iSectionPoint.input.tw,
                line: [[lstiff[2], lstiff[3]]],
                sectionView: {
                    point: GetWeldingPoint([lstiff[2], lstiff[3]], 0.5),
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
    let leftCp = new RefPoint({ ...gcp }, { x: vec.x, y: vec.y, z: 0 });
    let leftModel = GenHPlate(lPlate, leftCp, 12, -12, 0, 0, lrot, lPlateSection, false, false, null, null, leftMeta, leftAdd);
    result["children"].push(leftModel);

    let rwebPlate = [
        tr,
        { x: tr.x, y: tr.y - xs.webHeight },
        { x: tr.x - xs.bracketLength, y: tr.y - xs.webHeight - lGradient * xs.bracketLength },
        { x: tr.x - xs.bracketLength, y: ufr.y - uGradient * (xs.bracketLength - (tr.x - ufr.x)) },
        ufr,
    ];
    let webBracket1Meta = { part: partKey, key: "webBracket1" };
    let webBracket1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: jSectionPoint.input.tw,
                line: [[rwebPlate[0], rwebPlate[1]]],
                sectionView: {
                    point: GetWeldingPoint([rwebPlate[0], rwebPlate[1]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: xs.flangeThickness,
                line: [[rwebPlate[1], rwebPlate[2]]],
                topView: {
                    point: GetWeldingPoint([PointToGlobal(rwebPlate[1], refCenterPoint), PointToGlobal(rwebPlate[2], refCenterPoint)], 0.5),
                    isUpper: false,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: jSectionPoint.input.tuf,
                line: [[rwebPlate[0], rwebPlate[3]]],
                bottomView: {
                    point: GetWeldingPoint([PointToGlobal(rwebPlate[0], refCenterPoint), PointToGlobal(rwebPlate[3], refCenterPoint)], 0.5),
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
    let webBracket1Model = GenVPlate(
        rwebPlate,
        centerPoint,
        xs.webThickness,
        [],
        0,
        null,
        null,
        [],
        [0, 3],
        null,
        [1, 2],
        webBracketMeta,
        webBracket1Add
    );
    result["children"].push(webBracket1Model);

    let rstiff = [
        { x: tr.x, y: tr.y - xs.webHeight - xs.flangeThickness },
        br,
        { x: br.x - xs.stiffWidth, y: br.y },
        { x: tr.x - xs.bracketLength, y: tr.y - xs.webHeight - xs.flangeThickness - lGradient * xs.bracketLength - 30 },
        { x: tr.x - xs.bracketLength, y: tr.y - xs.webHeight - xs.flangeThickness - lGradient * xs.bracketLength },
    ];
    let stiffner1Meta = { part: partKey, key: "stiffner1" };
    let stiffner1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: jSectionPoint.input.tw,
                line: [[rstiff[0], rstiff[1]]],
                sectionView: {
                    point: GetWeldingPoint([rstiff[0], rstiff[1]], 0.5),
                    isUpper: false,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: xs.flangeThickness,
                line: [[rstiff[0], rstiff[4]]],
            },
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: jSectionPoint.input.tlf,
                line: [[rstiff[1], rstiff[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let stiffner1Model = GenVPlate(
        rstiff,
        centerPoint,
        xs.stiffThickness,
        [0, 1],
        xs.scallopRadius,
        null,
        null,
        [],
        null,
        null,
        null,
        stiffnerMeta,
        stiffner1Add
    );
    result["children"].push(stiffner1Model);

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
    let grcp = PointToGlobal(rcp, refCenterPoint);
    let rightCp = new RefPoint({ ...grcp }, { x: vec.x, y: vec.y, z: 0 });
    let rightMeta = { part: partKey, key: "rstiffPlate" };
    let rightAdd = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: jSectionPoint.input.tw,
                line: [[rstiff[2], rstiff[3]]],
                sectionView: {
                    point: GetWeldingPoint([rstiff[2], rstiff[3]], 0.5),
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

    let rightModel = GenHPlate(
        rPlate,
        rightCp,
        12,
        -12,
        0,
        0,
        rrot,
        GenHPlateSide(-rL / 2, rL / 2, 12, -12, rcp, rrot, rightAngle, rightAngle),
        false,
        false,
        null,
        null,
        rightMeta,
        rightAdd
    );
    result["children"].push(rightModel);

    let bracketPoint = [lstiff[0], rstiff[0], ufl, ufr];
    let bracketModelList = [];
    let skewSin = (Math.sin((centerPoint.skew * Math.PI) / 180) * xs.flangeWidth) / 2;
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
        let th1 = i < 2 ? Math.PI / 2 + grad : rightAngle;
        let top2D = i < 2 ? false : true;
        let cp = PointToGlobal(bracketPoint[i], refCenterPoint);
        let t2 = [iSectionPoint.input.tw, jSectionPoint.input.tw, iSectionPoint.input.tuf, jSectionPoint.input.tuf];
        let weldType = i < 2 ? "FF" : "B";
        let weldView =
            i < 2
                ? {
                      bottomView: {
                          point: cp,
                          isUpper: true,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  }
                : {
                      topView: {
                          point: cp,
                          isUpper: true,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  };

        let bracketMeta = { part: partKey, key: "bracket" + i.toFixed(0) };
        let bracketAdd = {
            properties: {},
            weld: [
                {
                    type: weldType,
                    thickness1: xs.flangeThickness,
                    thickness2: t2[i],
                    line: [[lowerbracket1[0], lowerbracket1[7]]],
                    ...weldView,
                },
            ],
            textLabel: {},
            dimension: {},
        };
        let bracketCenterPoint = { ...refCenterPoint, ...cp };
        let bracketModel = GenHPlate(
            bracketShape,
            bracketCenterPoint,
            xs.flangeThickness,
            0,
            centerPoint.skew,
            0,
            grad,
            GenHPlateSide(0, (sign * bracketLength) / Math.cos(grad), xs.flangeThickness, 0, bracketPoint[i], grad, th1, Math.PI / 2 + grad),
            top2D,
            false,
            !top2D,
            null,
            flangeBracketMeta,
            bracketAdd
        );
        result["children"].push(bracketModel);
        bracketModelList.push(bracketModel);
    }

    let webPlate = [lwebPlate[2], rwebPlate[2], rwebPlate[3], lwebPlate[3]];
    let webPlateMeta = { part: partKey, key: "webPlate" };
    let webPlateAdd = { properties: {}, weld: {}, textLabel: {}, dimension: {} };
    let webPlateModel = GenVPlate(webPlate, centerPoint, xs.webThickness, [], 0, null, null, [], [2, 3], null, [0, 1], webPlateMeta, webPlateAdd);
    result["children"].push(webPlateModel);

    let l = Math.sqrt((lwebPlate[3].x - rwebPlate[3].x) ** 2 + (lwebPlate[3].y - rwebPlate[3].y) ** 2);
    let uflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: l + skewSin, y: -xs.flangeWidth / 2 },
        { x: l - skewSin, y: xs.flangeWidth / 2 },
    ];
    let uPoint = PointToGlobal(lwebPlate[3], refCenterPoint); //가로보 중심축을 기준으로 해야 측면도상의 중심단면이 반영됨. 추후 수정 필요
    let uflangeCenterPoint = { ...refCenterPoint, ...uPoint };
    let uflangeSkew = uflangeCenterPoint.skew;
    let uflangeMeta = { part: partKey, key: "upperflange" };
    let uflangeAdd = { properties: {}, weld: {}, textLabel: {}, dimension: {} };
    let uflangeModel = GenHPlate(
        uflangePlate,
        uflangeCenterPoint,
        xs.flangeThickness,
        0,
        uflangeSkew,
        0,
        uRad,
        GenHPlateSide(0, l, xs.flangeThickness, 0, lwebPlate[3], uRad, Math.PI / 2 + uRad, Math.PI / 2 + uRad),
        true,
        null,
        false,
        null,
        uflangeMeta,
        uflangeAdd
    );
    result["children"].push(uflangeModel);

    let ll = Math.sqrt((lwebPlate[2].x - rwebPlate[2].x) ** 2 + (lwebPlate[2].y - rwebPlate[2].y) ** 2);
    let lflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: ll + skewSin, y: -xs.flangeWidth / 2 },
        { x: ll - skewSin, y: xs.flangeWidth / 2 },
    ];
    let lPoint = PointToGlobal(lwebPlate[2], refCenterPoint);
    let lflangeCenterPoint = { ...refCenterPoint, ...lPoint };
    let lflangeMeta = { part: partKey, key: "lowerflange" };
    let lflangeAdd = { properties: {}, weld: {}, textLabel: {}, dimension: {} };
    let lflangeModel = GenHPlate(
        lflangePlate,
        lflangeCenterPoint,
        xs.flangeThickness,
        -xs.flangeThickness,
        uflangeSkew,
        0,
        lRad,
        GenHPlateSide(0, ll, -xs.flangeThickness, 0, lwebPlate[2], lRad, Math.PI / 2 + lRad, Math.PI / 2 + lRad),
        false,
        null,
        true,
        null,
        lflangeMeta,
        lflangeAdd
    );
    result["children"].push(lflangeModel);

    // 이음부 모델
    let joint = GenIBeamJointDict(webPlate, centerPoint, xs, wBolt, fBolt);
    for (let i in joint) {
        let splitKey = i.split("");
        let strKey = splitKey.filter(str => isNaN(str * 1));
        let keyName = strKey.join("");
        let matName = i.includes("Bolt") ? "Bolt" : "Steel";
        let model = joint[i];
        model.meta = { part: partKey, key: keyName, material: matName };
        model.properties = {};
        model.weld = {};
        model.textLabel = {};
        model.dimension = {};
        result["children"].push(model);
    }

    let data = [
        PointToGlobal(
            {
                x: (lwebPlate[0].x + lwebPlate[1].x) / 2,
                y: (lwebPlate[0].y + lwebPlate[1].y) / 2,
                z: (lwebPlate[0].z + lwebPlate[1].z) / 2,
            },
            refCenterPoint
        ),
        PointToGlobal(
            {
                x: (rwebPlate[0].x + rwebPlate[1].x) / 2,
                y: (rwebPlate[0].y + rwebPlate[1].y) / 2,
                z: (rwebPlate[0].z + rwebPlate[1].z) / 2,
            },
            refCenterPoint
        ),
    ];
    let section = [
        xs.flangeWidth,
        xs.flangeThickness,
        xs.flangeWidth,
        xs.flangeThickness,
        xs.webHeight,
        xs.webThickness,
        xs.stiffThickness,
        xs.stiffWidth,
    ];

    let topLeftDimPoints = [
        bracketModelList[2]["model"]["topView"][0],
        bracketModelList[2]["model"]["topView"][bracketModelList[2]["model"]["topView"].length / 2 - 1],
        bracketModelList[2]["model"]["topView"][bracketModelList[2]["model"]["topView"].length / 2],
        bracketModelList[2]["model"]["topView"][bracketModelList[2]["model"]["topView"].length - 1],
    ];

    let topRightDimPoints = [
        bracketModelList[3]["model"]["topView"][0],
        bracketModelList[3]["model"]["topView"][bracketModelList[3]["model"]["topView"].length / 2 - 1],
        bracketModelList[3]["model"]["topView"][bracketModelList[3]["model"]["topView"].length / 2],
        bracketModelList[3]["model"]["topView"][bracketModelList[3]["model"]["topView"].length - 1],
    ];
    let bottomLeftDimPoints = [
        bracketModelList[0]["model"]["bottomView"][0],
        bracketModelList[0]["model"]["bottomView"][bracketModelList[0]["model"]["bottomView"].length / 2 - 1],
        bracketModelList[0]["model"]["bottomView"][bracketModelList[0]["model"]["bottomView"].length / 2],
        bracketModelList[0]["model"]["bottomView"][bracketModelList[0]["model"]["bottomView"].length - 1],
    ];
    let bottomRightDimPoints = [
        bracketModelList[1]["model"]["bottomView"][0],
        bracketModelList[1]["model"]["bottomView"][bracketModelList[1]["model"]["bottomView"].length / 2 - 1],
        bracketModelList[1]["model"]["bottomView"][bracketModelList[1]["model"]["bottomView"].length / 2],
        bracketModelList[1]["model"]["bottomView"][bracketModelList[1]["model"]["bottomView"].length - 1],
    ];

    let sectionTopDimPoints = [tl, webBracket0Model["model"]["sectionView"][2], webBracket1Model["model"]["sectionView"][2], tr];
    let sectionBottomDimPoints = [bl, webBracket0Model["model"]["sectionView"][3], webBracket1Model["model"]["sectionView"][3], br];

    let sectionLeftDimPoints = [bl, bracketModelList[0]["model"]["sectionView"][0], bracketModelList[0]["model"]["sectionView"][3], tl];
    let sectionRightDimPoints = [br, bracketModelList[0]["model"]["sectionView"][1], bracketModelList[1]["model"]["sectionView"][3], tr];
    let topIndex = sectionTopDimPoints[0].y > sectionTopDimPoints[sectionTopDimPoints.length - 1].y ? true : false;
    let bottomIndex = sectionBottomDimPoints[0].y < sectionBottomDimPoints[sectionBottomDimPoints.length - 1].y ? true : false;

    result["parent"].push({
        part: partKey,
        id:
            xbeamSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        point: centerPoint,
        inode: iNodekey,
        jnode: jNodekey,
        key: partKey, //key, 해석모델의 단면형성을 위한 유니크한 키가 필요함
        isKframe: xbeamSectionName.includes("K형") ? true : false,
        data: data,
        section: section,
        dimension: {
            sectionView: [
                ToDimCont(
                    [sectionTopDimPoints[0], sectionTopDimPoints[sectionTopDimPoints.length - 1]],
                    fontSize,
                    layer,
                    true,
                    true,
                    0,
                    topIndex ? 0 : 1,
                    2
                ),
                ToDimCont(sectionTopDimPoints, fontSize, layer, true, true, 0, topIndex ? 0 : sectionTopDimPoints.length - 1, 1),
                ToDimCont(
                    [sectionBottomDimPoints[0], sectionBottomDimPoints[sectionBottomDimPoints.length - 1]],
                    fontSize,
                    layer,
                    true,
                    false,
                    0,
                    bottomIndex ? 0 : 1,
                    2
                ),
                ToDimCont(sectionBottomDimPoints, fontSize, layer, true, false, 0, bottomIndex ? 0 : sectionBottomDimPoints.length - 1, 1),
                ToDimCont([sectionLeftDimPoints[0], sectionLeftDimPoints[sectionLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimCont(sectionLeftDimPoints, fontSize, layer, false, false, 0, 0, 3),
                ToDimCont(sectionRightDimPoints, fontSize, layer, false, true, 0, 0, 4),
                ToDimCont([sectionRightDimPoints[0], sectionRightDimPoints[sectionRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 3),
                ,
            ],
            topView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, layer, false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, layer, false, true, 0, 0, 3),
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

function GenXBeam_PlateBottom(iPoint, jPoint, iSectionPoint, jSectionPoint, xs, iNodekey, jNodekey, xbeamSectionName) {
    const fontSize = 14;
    const layer = "DIM";
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

    let tlength = Math.sqrt((iPoint.x - jPoint.x) ** 2 + (iPoint.y - jPoint.y) ** 2);
    let vec = { x: (jPoint.x - iPoint.x) / tlength, y: (jPoint.y - iPoint.y) / tlength };
    let dOffset = (jPoint.offset - iPoint.offset) / 2;
    let dz = (jPoint.z - iPoint.z) / 2;

    let centerPoint = {
        x: (iPoint.x + jPoint.x) / 2,
        y: (iPoint.y + jPoint.y) / 2,
        z: (iPoint.z + jPoint.z) / 2,
        normalCos: iPoint.normalCos,
        normalSin: iPoint.normalSin,
        offset: (iPoint.offset + jPoint.offset) / 2,
    };
    let cw = centerPoint.normalCos * vec.y - centerPoint.normalSin * vec.x > 0 ? 1 : -1; // 반시계방향의 경우 1
    let dotVec = (centerPoint.normalCos * vec.x + centerPoint.normalSin * vec.y).toFixed(4) * 1;
    centerPoint.skew = cw * Math.acos(dotVec);
    let refCenterPoint = GetRefPoint(centerPoint);

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

    let result = { parent: [], children: [] };
    let partKey = iNodekey + jNodekey;

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

    let webBracket0Meta = { part: partKey, key: "webBracket0" };
    let webBracket0Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: iSectionPoint.input.tw,
                line: [[lwebPlate[0], lwebPlate[1]]],
                sectionView: {
                    point: GetWeldingPoint([lwebPlate[0], lwebPlate[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: xs.flangeThickness,
                line: [[lwebPlate[1], lwebPlate[2]]],
                topView: {
                    point: GetWeldingPoint([PointToGlobal(lwebPlate[1], refCenterPoint), PointToGlobal(lwebPlate[2], refCenterPoint)], 0.5),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: xs.flangeThickness,
                line: [[lwebPlate[0], lwebPlate[3]]],
                bottomView: {
                    point: GetWeldingPoint([PointToGlobal(lwebPlate[0], refCenterPoint), PointToGlobal(lwebPlate[3], refCenterPoint)], 0.5),
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
    let webBracket0Model = GenVPlate(
        lwebPlate,
        centerPoint,
        xs.webThickness,
        [],
        0,
        null,
        null,
        [],
        [0, 3],
        null,
        [2, 3],
        webBracket0Meta,
        webBracket0Add
    );
    result["children"].push(webBracket0Model);

    let webBracket1Meta = { part: partKey, key: "webBracket1" };
    let webBracket1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: jSectionPoint.input.tw,
                line: [[rwebPlate[0], rwebPlate[1]]],
                sectionView: {
                    point: GetWeldingPoint([rwebPlate[0], rwebPlate[1]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: xs.flangeThickness,
                line: [[rwebPlate[1], rwebPlate[2]]],
                topView: {
                    point: GetWeldingPoint([PointToGlobal(rwebPlate[1], refCenterPoint), PointToGlobal(rwebPlate[2], refCenterPoint)], 0.5),
                    isUpper: false,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.webThickness,
                thickness2: xs.flangeThickness,
                line: [[rwebPlate[0], rwebPlate[3]]],
                bottomView: {
                    point: GetWeldingPoint([PointToGlobal(rwebPlate[0], refCenterPoint), PointToGlobal(rwebPlate[3], refCenterPoint)], 0.5),
                    isUpper: false,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let webBracket1Model = GenVPlate(
        rwebPlate,
        centerPoint,
        xs.webThickness,
        [],
        0,
        null,
        null,
        [],
        [0, 3],
        null,
        [2, 3],
        webBracket1Meta,
        webBracket1Add
    );
    result["children"].push(webBracket1Model);

    let stiffner0Meta = { part: partKey, key: "stiffner0" };
    let stiffner0Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: iSectionPoint.input.tw,
                line: [[lstiffPoint[0], lstiffPoint[1]]],
                sectionView: {
                    point: GetWeldingPoint([lstiffPoint[0], lstiffPoint[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: xs.flangeThickness,
                line: [[lstiffPoint[0], lstiffPoint[5]]],
            },
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: iSectionPoint.input.tuf,
                line: [[lstiffPoint[1], lstiffPoint[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let stiffner0Model = GenVPlate(lstiff, centerPoint, xs.stiffThickness, [], 0, null, null, [], null, null, null, stiffner0Meta, stiffner0Add);
    result["children"].push(stiffner0Model);

    let stiffner1Meta = { part: partKey, key: "stiffner1" };
    let stiffner1Add = {
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: jSectionPoint.input.tw,
                line: [[rstiffPoint[0], rstiffPoint[1]]],
                sectionView: {
                    point: GetWeldingPoint([rstiffPoint[0], rstiffPoint[1]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: xs.flangeThickness,
                line: [[rstiffPoint[0], rstiffPoint[5]]],
            },
            {
                type: "FF",
                thickness1: xs.stiffThickness,
                thickness2: jSectionPoint.input.tuf,
                line: [[rstiffPoint[1], rstiffPoint[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    };
    let stiffner1Model = GenVPlate(rstiff, centerPoint, xs.stiffThickness, [], 0, null, null, [], null, null, null, stiffner1Meta, stiffner1Add);
    result["children"].push(stiffner1Model);

    let bracketPoint = [lwebPlate[0], rwebPlate[0], lfl, lfr];
    let bracketModelList = [];
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
        let bracketShape = [
            lowerbracket1[0],
            lowerbracket1[1],
            ...GetFilletPoints2D(lowerbracket1[1], lowerbracket1[2], lowerbracket1[3], xs.bracketFilletR, 4),
            lowerbracket1[3],

            ...GetFilletPoints2D(lowerbracket1[4], lowerbracket1[5], lowerbracket1[6], xs.bracketFilletR, 4),
            lowerbracket1[6],
        ];
        let top2D = i < 2 ? true : false;
        let t2 = i % 2 === 0 ? iSectionPoint.input.tw : jSectionPoint.input.tw;
        let bracketCoord = PointToGlobal(bracketPoint[i], refCenterPoint);
        let bracketCenterPoint = { ...refCenterPoint, ...bracketCoord };
        let weldView =
            i < 2
                ? {
                      bottomView: {
                          point: bracketCenterPoint,
                          isUpper: true,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  }
                : {
                      topView: {
                          point: bracketCenterPoint,
                          isUpper: true,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  };

        let bracketMeta = { part: partKey, key: "bracket" + i.toFixed(0) };
        let bracketAdd = {
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: xs.flangeThickness,
                    thickness2: t2,
                    line: [[lowerbracket1[0], lowerbracket1[7]]],
                    ...weldView,
                },
            ],
            textLabel: {},
            dimension: {},
        };
        let bracketModel = GenHPlate(
            bracketShape,
            bracketCenterPoint,
            xs.flangeThickness,
            z,
            centerPoint.skew,
            0,
            grad,
            GenHPlateSide(0, (sign * bracketLength) / Math.cos(grad), thickness, 0, bracketPoint[i], grad, Math.PI / 2 + grad, Math.PI / 2 + grad),
            top2D,
            false,
            !top2D,
            null,
            bracketMeta,
            bracketAdd
        );
        result["children"].push(bracketModel);
        bracketModelList.push(bracketModel);
    }
    let webPlate = [lwebPlate[3], rwebPlate[3], rwebPlate[4], lwebPlate[4]];
    let webPlateMeta = { part: partKey, key: "webPlate" };
    let webPlateAdd = { properties: {}, weld: {}, textLabel: {}, dimension: {} };
    let webPlateModel = GenVPlate(webPlate, centerPoint, xs.webThickness, [], 0, null, null, [], [2, 3], null, [0, 1], webPlateMeta, webPlateAdd);
    result["children"].push(webPlateModel);

    let l = Math.sqrt((lwebPlate[4].x - rwebPlate[4].x) ** 2 + (lwebPlate[4].y - rwebPlate[4].y) ** 2);
    let uflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: l + skewSin, y: -xs.flangeWidth / 2 },
        { x: l - skewSin, y: xs.flangeWidth / 2 },
    ];
    let uCoord = PointToGlobal(lwebPlate[4], refCenterPoint);
    let uPoint = { ...refCenterPoint, ...uCoord };
    let uflangePlateMeta = { part: partKey, key: "upperflange" };
    let uflangePlateAdd = { properties: {}, weld: {}, textLabel: {}, dimension: {} };
    let uflangePlateModel = GenHPlate(
        uflangePlate,
        uPoint,
        xs.flangeThickness,
        0,
        uPoint.skew,
        0,
        uRad,
        GenHPlateSide(0, l, xs.flangeThickness, 0, lwebPlate[4], uRad, Math.PI / 2 + uRad, Math.PI / 2 + uRad),
        true,
        null,
        false,
        null,
        uflangePlateMeta,
        uflangePlateAdd
    );
    result["children"].push(uflangePlateModel);

    let ll = Math.sqrt((lwebPlate[3].x - rwebPlate[3].x) ** 2 + (lwebPlate[3].y - rwebPlate[3].y) ** 2);
    let lflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: ll + skewSin, y: -xs.flangeWidth / 2 },
        { x: ll - skewSin, y: xs.flangeWidth / 2 },
    ];
    let lCoord = PointToGlobal(lwebPlate[3], refCenterPoint);
    let lPoint = { ...refCenterPoint, ...lCoord };
    let lflangePlateMeta = { part: partKey, key: "lowerflange" };
    let lflangePlateAdd = { properties: {}, weld: {}, textLabel: {}, dimension: {} };
    let lflangePlateModel = GenHPlate(
        lflangePlate,
        lPoint,
        xs.flangeThickness,
        -xs.flangeThickness,
        uPoint.skew,
        0,
        lRad,
        GenHPlateSide(0, ll, -xs.flangeThickness, 0, lwebPlate[3], lRad, Math.PI / 2 + lRad, Math.PI / 2 + lRad),
        false,
        null,
        true,
        null,
        lflangePlateMeta,
        lflangePlateAdd
    );
    result["children"].push(lflangePlateModel);

    let joint = GenIBeamJointDict(webPlate, centerPoint, xs, wBolt, fBolt);
    for (let i in joint) {
        let matName = i.includes("Bolt") ? "Bolt" : "Steel";
        let model = joint[i];
        model.meta = { part: partKey, key: i, material: matName };
        model.properties = {};
        model.weld = {};
        model.textLabel = {};
        model.dimension = {};
        result["children"].push(model);
    }

    let data = [
        PointToGlobal(
            {
                x: (lwebPlate[0].x + lwebPlate[1].x) / 2,
                y: (lwebPlate[0].y + lwebPlate[1].y) / 2,
                z: (lwebPlate[0].z + lwebPlate[1].z) / 2,
            },
            refCenterPoint
        ),
        PointToGlobal(
            {
                x: (rwebPlate[0].x + rwebPlate[1].x) / 2,
                y: (rwebPlate[0].y + rwebPlate[1].y) / 2,
                z: (rwebPlate[0].z + rwebPlate[1].z) / 2,
            },
            refCenterPoint
        ),
    ];
    let section = [
        xs.flangeWidth,
        xs.flangeThickness,
        xs.flangeWidth,
        xs.flangeThickness,
        xs.webHeight,
        xs.webThickness,
        xs.stiffThickness,
        xs.stiffWidth,
    ];

    let topLeftDimPoints = [
        bracketModelList[0]["model"]["topView"][0],
        bracketModelList[0]["model"]["topView"][bracketModelList[0]["model"]["topView"].length / 2 - 1],
        bracketModelList[0]["model"]["topView"][bracketModelList[0]["model"]["topView"].length / 2],
        bracketModelList[0]["model"]["topView"][bracketModelList[0]["model"]["topView"].length - 1],
    ];

    let topRightDimPoints = [
        bracketModelList[1]["model"]["topView"][0],
        bracketModelList[1]["model"]["topView"][bracketModelList[1]["model"]["topView"].length / 2 - 1],
        bracketModelList[1]["model"]["topView"][bracketModelList[1]["model"]["topView"].length / 2],
        bracketModelList[1]["model"]["topView"][bracketModelList[1]["model"]["topView"].length - 1],
    ];
    let bottomLeftDimPoints = [
        bracketModelList[2]["model"]["bottomView"][0],
        bracketModelList[2]["model"]["bottomView"][bracketModelList[2]["model"]["bottomView"].length / 2 - 1],
        bracketModelList[2]["model"]["bottomView"][bracketModelList[2]["model"]["bottomView"].length / 2],
        bracketModelList[2]["model"]["bottomView"][bracketModelList[2]["model"]["bottomView"].length - 1],
    ];
    let bottomRightDimPoints = [
        bracketModelList[3]["model"]["bottomView"][0],
        bracketModelList[3]["model"]["bottomView"][bracketModelList[3]["model"]["bottomView"].length / 2 - 1],
        bracketModelList[3]["model"]["bottomView"][bracketModelList[3]["model"]["bottomView"].length / 2],
        bracketModelList[3]["model"]["bottomView"][bracketModelList[3]["model"]["bottomView"].length - 1],
    ];

    let sectionTopDimPoints = [tl, webBracket0Model["model"]["sectionView"][2], webBracket1Model["model"]["sectionView"][2], tr];
    let sectionBottomDimPoints = [bl, webBracket0Model["model"]["sectionView"][3], webBracket1Model["model"]["sectionView"][3], br];

    let sectionLeftDimPoints = [bl, bracketModelList[0]["model"]["sectionView"][0], bracketModelList[0]["model"]["sectionView"][3], tl];
    let sectionRightDimPoints = [br, bracketModelList[0]["model"]["sectionView"][1], bracketModelList[1]["model"]["sectionView"][3], tr];

    let topIndex = sectionTopDimPoints[0].y > sectionTopDimPoints[sectionTopDimPoints.length - 1].y ? true : false;
    let bottomIndex = sectionBottomDimPoints[0].y < sectionBottomDimPoints[sectionBottomDimPoints.length - 1].y ? true : false;

    result["parent"].push({
        part: partKey,
        id:
            xbeamSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        point: centerPoint,
        inode: iNodekey,
        jnode: jNodekey,
        key: partKey, //key, 해석모델의 단면형성을 위한 유니크한 키가 필요함
        isKframe: xbeamSectionName.includes("K형") ? true : false,
        data: data,
        section: section,
        dimension: {
            sectionView: [
                ToDimCont(
                    [sectionTopDimPoints[0], sectionTopDimPoints[sectionTopDimPoints.length - 1]],
                    fontSize,
                    layer,
                    true,
                    true,
                    0,
                    topIndex ? 0 : 1,
                    2
                ),
                ToDimCont(sectionTopDimPoints, fontSize, layer, true, true, 0, topIndex ? 0 : sectionTopDimPoints.length - 1, 1),
                ToDimCont(
                    [sectionBottomDimPoints[0], sectionBottomDimPoints[sectionBottomDimPoints.length - 1]],
                    fontSize,
                    layer,
                    true,
                    false,
                    0,
                    bottomIndex ? 0 : 1,
                    2
                ),
                ToDimCont(sectionBottomDimPoints, fontSize, layer, true, false, 0, bottomIndex ? 0 : sectionBottomDimPoints.length - 1, 1),
                ToDimCont([sectionLeftDimPoints[0], sectionLeftDimPoints[sectionLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimCont(sectionLeftDimPoints, fontSize, layer, false, false, 0, 0, 3),
                ToDimCont(sectionRightDimPoints, fontSize, layer, false, true, 0, 0, 4),
                ToDimCont([sectionRightDimPoints[0], sectionRightDimPoints[sectionRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 3),
                ,
            ],
            topView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, layer, false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, layer, false, true, 0, 0, 3),
            ],
            bottomView: [
                ToDimCont([bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimCont([bottomRightDimPoints[0], bottomRightDimPoints[bottomRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 4),
                ToDimCont([bottomRightDimPoints[0], bottomRightDimPoints[bottomRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 4),
                ToDimCont(bottomRightDimPoints, fontSize, layer, false, true, 0, 0, 3),
            ],
        },
    });
    return result;
}

export function GenXBeam_PlateCenter(iPoint, jPoint, iSectionPoint, jSectionPoint, xs, iNodekey, jNodekey, xbeamSectionName) {
    const fontSize = 14;
    const layer = "DIM";
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

    let tlength = Math.sqrt((iPoint.x - jPoint.x) ** 2 + (iPoint.y - jPoint.y) ** 2);
    let vec = { x: (jPoint.x - iPoint.x) / tlength, y: (jPoint.y - iPoint.y) / tlength };
    let dOffset = (jPoint.offset - iPoint.offset) / 2;
    let dz = (jPoint.z - iPoint.z) / 2;

    let centerPoint = {
        x: (iPoint.x + jPoint.x) / 2,
        y: (iPoint.y + jPoint.y) / 2,
        z: (iPoint.z + jPoint.z) / 2,
        normalCos: iPoint.normalCos,
        normalSin: iPoint.normalSin,
        offset: (iPoint.offset + jPoint.offset) / 2,
    };
    let cw = centerPoint.normalCos * vec.y - centerPoint.normalSin * vec.x > 0 ? 1 : -1; // 반시계방향의 경우 1
    let dotVec = (centerPoint.normalCos * vec.x + centerPoint.normalSin * vec.y).toFixed(4) * 1;
    // centerPoint.skew = Math.PI / 2 + cw * Math.acos(dotVec);
    centerPoint.skew = cw * Math.acos(dotVec);
    let refCenterPoint = GetRefPoint(centerPoint);

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
    let partKey = iNodekey + jNodekey;

    let uGradient = (ufr.y - ufl.y) / (ufr.x - ufl.x);
    let lGradient = (br.y - bl.y) / (br.x - bl.x);
    let lRad = -Math.atan(lGradient);

    let lwebPlate = GetPlateRestPoint(
        { x: bl.x, y: bl.y + xs.lflangeHeight },
        { x: bl.x, y: bl.y + xs.webHeight + xs.lflangeHeight },
        lGradient,
        lGradient,
        xs.bracketLength
    );
    let lstiff = GetPlateRestPoint({ x: bl.x, y: bl.y + xs.lflangeHeight - xs.flangeThickness }, bl, lGradient, 0, xs.stiffWidth);
    let lstiff2 = GetPlateRestPoint(
        { x: bl.x, y: bl.y + xs.lflangeHeight + xs.webHeight + xs.flangeThickness },
        tl,
        lGradient,
        uGradient,
        xs.stiffWidth
    );
    let rwebPlate = GetPlateRestPoint(
        { x: br.x, y: br.y + xs.lflangeHeight },
        { x: br.x, y: br.y + xs.webHeight + xs.lflangeHeight },
        lGradient,
        lGradient,
        -xs.bracketLength
    );
    let rstiff = GetPlateRestPoint({ x: br.x, y: br.y + xs.lflangeHeight - xs.flangeThickness }, br, lGradient, 0, -xs.stiffWidth);
    let rstiff2 = GetPlateRestPoint(
        { x: br.x, y: br.y + xs.lflangeHeight + xs.webHeight + xs.flangeThickness },
        tr,
        lGradient,
        uGradient,
        -xs.stiffWidth
    );
    let webBracketModel0 = GenVPlate(lwebPlate, centerPoint, xs.webThickness, [], 0, null, null, [], [0, 3], null, [0, 3]);
    let webBracketModel1 = GenVPlate(rwebPlate, centerPoint, xs.webThickness, [], 0, null, null, [], [0, 3], null, [0, 3]);
    let stiffnerModel0 = GenVPlate(lstiff, centerPoint, xs.stiffThickness, [0, 1], xs.scallopRadius, null, null, []);
    let stiffnerModel1 = GenVPlate(rstiff, centerPoint, xs.stiffThickness, [0, 1], xs.scallopRadius, null, null, []);
    let stiffnerModel2 = GenVPlate(lstiff2, centerPoint, xs.stiffThickness, [0, 1], xs.scallopRadius, null, null, []);
    let stiffnerModel3 = GenVPlate(rstiff2, centerPoint, xs.stiffThickness, [0, 1], xs.scallopRadius, null, null, []);

    webBracketModel0.meta.part = partKey;
    webBracketModel0.meta.key = "webBracket0";
    webBracketModel0.properties = {};
    webBracketModel0.weld = [
        {
            type: "FF",
            thickness1: xs.webThickness,
            thickness2: iSectionPoint.input.tw,
            line: [[lwebPlate[0], lwebPlate[1]]],
            sectionView: {
                point: GetWeldingPoint([lwebPlate[0], lwebPlate[1]], 0.5),
                isUpper: true,
                isRight: true,
                isXReverse: false,
                isYReverse: false,
            },
        },
        {
            type: "FF",
            thickness1: xs.webThickness,
            thickness2: xs.flangeThickness,
            line: [[lwebPlate[1], lwebPlate[2]]],
            topView: {
                point: GetWeldingPoint([PointToGlobal(lwebPlate[1], refCenterPoint), PointToGlobal(lwebPlate[2], refCenterPoint)], 0.5),
                isUpper: false,
                isRight: true,
                isXReverse: false,
                isYReverse: false,
            },
        },
        {
            type: "FF",
            thickness1: xs.webThickness,
            thickness2: xs.flangeThickness,
            line: [[lwebPlate[0], lwebPlate[3]]],
            bottomView: {
                point: GetWeldingPoint([PointToGlobal(lwebPlate[0], refCenterPoint), PointToGlobal(lwebPlate[3], refCenterPoint)], 0.5),
                isUpper: false,
                isRight: true,
                isXReverse: false,
                isYReverse: false,
            },
        },
    ];
    webBracketModel0.textLabel = {};
    webBracketModel0.dimension = {};

    stiffnerModel0.meta.part = partKey;
    stiffnerModel0.meta.key = "stiffner0";
    stiffnerModel0.properties = {};
    stiffnerModel0.weld = [
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: iSectionPoint.input.tw,
            line: [[lstiff[0], lstiff[1]]],
            sectionView: {
                point: GetWeldingPoint([lstiff[0], lstiff[1]], 0.5),
                isUpper: true,
                isRight: true,
                isXReverse: false,
                isYReverse: false,
            },
        },
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: xs.flangeThickness,
            line: [[lstiff[0], lstiff[3]]],
        },
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: iSectionPoint.input.tlf,
            line: [[lstiff[1], lstiff[2]]],
        },
    ];
    stiffnerModel0.textLabel = {};
    stiffnerModel0.dimension = {};

    stiffnerModel2.meta.part = partKey;
    stiffnerModel2.meta.key = "stiffner2";
    stiffnerModel2.properties = {};
    stiffnerModel2.weld = [
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: iSectionPoint.input.tw,
            line: [[lstiff2[0], lstiff2[1]]],
            sectionView: {
                point: GetWeldingPoint([lstiff2[0], lstiff2[1]], 0.5),
                isUpper: false,
                isRight: true,
                isXReverse: false,
                isYReverse: false,
            },
        },
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: xs.flangeThickness,
            line: [[lstiff2[0], lstiff2[3]]],
        },
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: iSectionPoint.input.tuf,
            line: [[lstiff2[1], lstiff2[2]]],
        },
    ];
    stiffnerModel2.textLabel = {};
    stiffnerModel2.dimension = {};

    webBracketModel1.meta.part = partKey;
    webBracketModel1.meta.key = "webBracket1";
    webBracketModel1.properties = {};
    webBracketModel1.weld = [
        {
            type: "FF",
            thickness1: xs.webThickness,
            thickness2: jSectionPoint.input.tw,
            line: [[rwebPlate[0], rwebPlate[1]]],
            sectionView: {
                point: GetWeldingPoint([rwebPlate[0], rwebPlate[1]], 0.5),
                isUpper: true,
                isRight: false,
                isXReverse: false,
                isYReverse: false,
            },
        },
        {
            type: "FF",
            thickness1: xs.webThickness,
            thickness2: xs.flangeThickness,
            line: [[rwebPlate[1], rwebPlate[2]]],
            topView: {
                point: GetWeldingPoint([PointToGlobal(rwebPlate[1], refCenterPoint), PointToGlobal(rwebPlate[2], refCenterPoint)], 0.5),
                isUpper: false,
                isRight: false,
                isXReverse: false,
                isYReverse: false,
            },
        },
        {
            type: "FF",
            thickness1: xs.webThickness,
            thickness2: xs.flangeThickness,
            line: [[rwebPlate[0], rwebPlate[3]]],
            bottomView: {
                point: GetWeldingPoint([PointToGlobal(rwebPlate[0], refCenterPoint), PointToGlobal(rwebPlate[3], refCenterPoint)], 0.5),
                isUpper: false,
                isRight: false,
                isXReverse: false,
                isYReverse: false,
            },
        },
    ];
    webBracketModel1.textLabel = {};
    webBracketModel1.dimension = {};

    stiffnerModel1.meta.part = partKey;
    stiffnerModel1.meta.key = "stiffner1";
    stiffnerModel1.properties = {};
    stiffnerModel1.weld = [
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: jSectionPoint.input.tw,
            line: [[rstiff[0], rstiff[1]]],
            sectionView: {
                point: GetWeldingPoint([rstiff[0], rstiff[1]], 0.5),
                isUpper: true,
                isRight: false,
                isXReverse: false,
                isYReverse: false,
            },
        },
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: xs.flangeThickness,
            line: [[rstiff[0], rstiff[3]]],
        },
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: jSectionPoint.input.tlf,
            line: [[rstiff[1], rstiff[2]]],
        },
    ];
    stiffnerModel1.textLabel = {};
    stiffnerModel1.dimension = {};

    stiffnerModel3.meta.part = partKey;
    stiffnerModel3.meta.key = "stiffner3";
    stiffnerModel3.properties = {};
    stiffnerModel3.weld = [
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: jSectionPoint.input.tw,
            line: [[rstiff2[0], rstiff2[1]]],
            sectionView: {
                point: GetWeldingPoint([rstiff2[0], rstiff2[1]], 0.5),
                isUpper: false,
                isRight: false,
                isXReverse: false,
                isYReverse: false,
            },
        },
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: xs.flangeThickness,
            line: [[rstiff2[0], rstiff2[3]]],
        },
        {
            type: "FF",
            thickness1: xs.stiffThickness,
            thickness2: jSectionPoint.input.tuf,
            line: [[rstiff2[1], rstiff2[2]]],
        },
    ];
    stiffnerModel3.textLabel = {};
    stiffnerModel3.dimension = {};
    result["children"].push(webBracketModel0, webBracketModel1, stiffnerModel0, stiffnerModel1, stiffnerModel2, stiffnerModel3);

    let bracketPoint = [lwebPlate[0], rwebPlate[0], lwebPlate[1], rwebPlate[1]];
    let bracketModelList = [];
    // let skewSin = (Math.sin(centerPoint.skew - Math.PI / 2) * xs.flangeWidth) / 2;
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
        let top2D = i < 2 ? false : true;
        let t2 = i % 2 === 0 ? iSectionPoint.input.tw : jSectionPoint.input.tw;
        let bracketSection = GenHPlateSide(
            0,
            (sign * bracketLength) / Math.cos(grad),
            thickness,
            0,
            bracketPoint[i],
            grad,
            Math.PI / 2 + grad,
            Math.PI / 2 + grad
        );
        let bracketCoord = PointToGlobal(bracketPoint[i], refCenterPoint);
        let bracketCenterPoint = { ...refCenterPoint, ...bracketCoord };
        let weldView =
            i < 2
                ? {
                      bottomView: {
                          point: bracketCenterPoint,
                          isUpper: true,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  }
                : {
                      topView: {
                          point: bracketCenterPoint,
                          isUpper: true,
                          isRight: true,
                          isXReverse: false,
                          isYReverse: false,
                      },
                  };
        let bracketModel = GenHPlate(
            bracketShape,
            bracketCenterPoint,
            xs.flangeThickness,
            z,
            centerPoint.skew,
            0,
            grad,
            bracketSection,
            top2D,
            false,
            !top2D
        );
        bracketModel.meta.part = partKey;
        bracketModel.meta.key = "bracket" + i.toFixed(0);
        bracketModel.properties = {};
        bracketModel.weld = [
            {
                type: "FF",
                thickness1: xs.flangeThickness,
                thickness2: t2,
                line: [[lowerbracket1[0], lowerbracket1[7]]],
                ...weldView,
            },
        ];
        bracketModel.textLabel = {};
        bracketModel.dimension = {};
        result["children"].push(bracketModel);
        bracketModelList.push(bracketModel);
    }
    let webPlate = [lwebPlate[3], rwebPlate[3], rwebPlate[2], lwebPlate[2]];
    let webPlateModel = GenVPlate(webPlate, centerPoint, xs.webThickness, [], 0, null, null, [], [2, 3], null, [0, 1]);
    webPlateModel.meta.part = partKey;
    webPlateModel.meta.key = "webPlate";
    webPlateModel.properties = {};
    webPlateModel.weld = {};
    webPlateModel.textLabel = {};
    webPlateModel.dimension = {};
    result["children"].push(webPlateModel);

    let l = Math.sqrt((lwebPlate[3].x - rwebPlate[3].x) ** 2 + (lwebPlate[3].y - rwebPlate[3].y) ** 2);
    let uflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: l + skewSin, y: -xs.flangeWidth / 2 },
        { x: l - skewSin, y: xs.flangeWidth / 2 },
    ];
    let uCoord = PointToGlobal(lwebPlate[2], refCenterPoint);
    let uPoint = { ...refCenterPoint, ...uCoord };
    let uflangePlateModel = GenHPlate(
        uflangePlate,
        uPoint,
        xs.flangeThickness,
        0,
        uPoint.skew,
        0,
        lRad,
        GenHPlateSide(0, l, xs.flangeThickness, 0, lwebPlate[2], lRad, Math.PI / 2 + lRad, Math.PI / 2 + lRad),
        true,
        null,
        false
    );
    uflangePlateModel.meta.part = partKey;
    uflangePlateModel.meta.key = "upperflange";
    uflangePlateModel.properties = {};
    uflangePlateModel.weld = {};
    uflangePlateModel.textLabel = {};
    uflangePlateModel.dimension = {};
    result["children"].push(uflangePlateModel);

    let ll = Math.sqrt((lwebPlate[2].x - rwebPlate[2].x) ** 2 + (lwebPlate[2].y - rwebPlate[2].y) ** 2);
    let lflangePlate = [
        { x: -skewSin, y: xs.flangeWidth / 2 },
        { x: skewSin, y: -xs.flangeWidth / 2 },
        { x: ll + skewSin, y: -xs.flangeWidth / 2 },
        { x: ll - skewSin, y: xs.flangeWidth / 2 },
    ];
    let lCoord = PointToGlobal(lwebPlate[3], refCenterPoint);
    let lPoint = { ...refCenterPoint, ...lCoord };
    let lflangePlateModel = GenHPlate(
        lflangePlate,
        lPoint,
        xs.flangeThickness,
        -xs.flangeThickness,
        uPoint.skew,
        0,
        lRad,
        GenHPlateSide(0, ll, -xs.flangeThickness, 0, lwebPlate[3], lRad, Math.PI / 2 + lRad, Math.PI / 2 + lRad),
        false,
        null,
        true
    );
    lflangePlateModel.meta.part = partKey;
    lflangePlateModel.meta.key = "lowerflange";
    lflangePlateModel.properties = {};
    lflangePlateModel.weld = {};
    lflangePlateModel.textLabel = {};
    lflangePlateModel.dimension = {};
    result["children"].push(lflangePlateModel);

    let joint = GenIBeamJointDict(webPlate, centerPoint, xs, wBolt, fBolt);
    for (let i in joint) {
        let matName = i.includes("Bolt") ? "Bolt" : "Steel";
        let model = joint[i];
        model.meta = { part: partKey, key: i, material: matName };
        model.properties = {};
        model.weld = {};
        model.textLabel = {};
        model.dimension = {};
        result["children"].push(model);
    }
    let data = [
        PointToGlobal(
            {
                x: (lwebPlate[0].x + lwebPlate[1].x) / 2,
                y: (lwebPlate[0].y + lwebPlate[1].y) / 2,
                z: (lwebPlate[0].z + lwebPlate[1].z) / 2,
            },
            refCenterPoint
        ),
        PointToGlobal(
            {
                x: (rwebPlate[0].x + rwebPlate[1].x) / 2,
                y: (rwebPlate[0].y + rwebPlate[1].y) / 2,
                z: (rwebPlate[0].z + rwebPlate[1].z) / 2,
            },
            refCenterPoint
        ),
    ];
    let section = [
        xs.flangeWidth,
        xs.flangeThickness,
        xs.flangeWidth,
        xs.flangeThickness,
        xs.webHeight,
        xs.webThickness,
        xs.stiffThickness,
        xs.stiffWidth,
    ];

    let topLeftDimPoints = [
        bracketModelList[2]["model"]["topView"][0],
        bracketModelList[2]["model"]["topView"][bracketModelList[2]["model"]["topView"].length / 2 - 1],
        bracketModelList[2]["model"]["topView"][bracketModelList[2]["model"]["topView"].length / 2],
        bracketModelList[2]["model"]["topView"][bracketModelList[2]["model"]["topView"].length - 1],
    ];

    let topRightDimPoints = [
        bracketModelList[3]["model"]["topView"][0],
        bracketModelList[3]["model"]["topView"][bracketModelList[3]["model"]["topView"].length / 2 - 1],
        bracketModelList[3]["model"]["topView"][bracketModelList[3]["model"]["topView"].length / 2],
        bracketModelList[3]["model"]["topView"][bracketModelList[3]["model"]["topView"].length - 1],
    ];
    let bottomLeftDimPoints = [
        bracketModelList[0]["model"]["bottomView"][0],
        bracketModelList[0]["model"]["bottomView"][bracketModelList[0]["model"]["bottomView"].length / 2 - 1],
        bracketModelList[0]["model"]["bottomView"][bracketModelList[0]["model"]["bottomView"].length / 2],
        bracketModelList[0]["model"]["bottomView"][bracketModelList[0]["model"]["bottomView"].length - 1],
    ];
    let bottomRightDimPoints = [
        bracketModelList[1]["model"]["bottomView"][0],
        bracketModelList[1]["model"]["bottomView"][bracketModelList[1]["model"]["bottomView"].length / 2 - 1],
        bracketModelList[1]["model"]["bottomView"][bracketModelList[1]["model"]["bottomView"].length / 2],
        bracketModelList[1]["model"]["bottomView"][bracketModelList[1]["model"]["bottomView"].length - 1],
    ];

    let sectionTopDimPoints = [tl, webBracketModel0["model"]["sectionView"][2], webBracketModel1["model"]["sectionView"][2], tr];
    let sectionBottomDimPoints = [bl, webBracketModel0["model"]["sectionView"][3], webBracketModel1["model"]["sectionView"][3], br];

    let sectionLeftDimPoints = [
        bl,
        bracketModelList[0]["model"]["sectionView"][0],
        bracketModelList[0]["model"]["sectionView"][3],
        bracketModelList[2]["model"]["sectionView"][3],
        bracketModelList[2]["model"]["sectionView"][0],
        tl,
    ];
    let sectionRightDimPoints = [
        br,
        bracketModelList[1]["model"]["sectionView"][0],
        bracketModelList[1]["model"]["sectionView"][3],
        bracketModelList[3]["model"]["sectionView"][3],
        bracketModelList[3]["model"]["sectionView"][0],
        tr,
    ];
    let topIndex = sectionTopDimPoints[0].y > sectionTopDimPoints[sectionTopDimPoints.length - 1].y ? true : false;
    let bottomIndex = sectionBottomDimPoints[0].y < sectionBottomDimPoints[sectionBottomDimPoints.length - 1].y ? true : false;

    result["parent"].push({
        part: partKey,
        id:
            xbeamSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        point: centerPoint,
        inode: iNodekey,
        jnode: jNodekey,
        key: partKey, //key, 해석모델의 단면형성을 위한 유니크한 키가 필요함
        isKframe: xbeamSectionName.includes("K형") ? true : false,
        data: data,
        section: section,
        dimension: {
            sectionView: [
                ToDimCont(
                    [sectionTopDimPoints[0], sectionTopDimPoints[sectionTopDimPoints.length - 1]],
                    fontSize,
                    layer,
                    true,
                    true,
                    0,
                    topIndex ? 0 : 1,
                    2
                ),
                ToDimCont(sectionTopDimPoints, fontSize, layer, true, true, 0, topIndex ? 0 : sectionTopDimPoints.length - 1, 1),
                ToDimCont(
                    [sectionBottomDimPoints[0], sectionBottomDimPoints[sectionBottomDimPoints.length - 1]],
                    fontSize,
                    layer,
                    true,
                    false,
                    0,
                    bottomIndex ? 0 : 1,
                    2
                ),
                ToDimCont(sectionBottomDimPoints, fontSize, layer, true, false, 0, bottomIndex ? 0 : sectionBottomDimPoints.length - 1, 1),
                ToDimCont([sectionLeftDimPoints[0], sectionLeftDimPoints[sectionLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimCont(sectionLeftDimPoints, fontSize, layer, false, false, 0, 0, 3),
                ToDimCont(sectionRightDimPoints, fontSize, layer, false, true, 0, 0, 4),

                ToDimCont([sectionRightDimPoints[0], sectionRightDimPoints[sectionRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 3),
            ],
            topView: [
                ToDimCont([topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], fontSize, layer, false, false, 0, 0, 4),
                ToDimCont(topLeftDimPoints, fontSize, layer, false, false, 0, 0, 3),
                ToDimCont([topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]], fontSize, layer, false, true, 0, 0, 4),
                ToDimCont(topRightDimPoints, fontSize, layer, false, true, 0, 0, 3),
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
