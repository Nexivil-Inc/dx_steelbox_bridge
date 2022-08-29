import { Circle, Extrude_rev, GetRefPoint, Line, PointToGlobal, RefPoint } from "@nexivil/package-modules";
import { GenBoltGeometry } from "./geometry";
import { GenHPlate, ToGlobalPoint2 } from "./utils";

export function GenSpliceModelFn(gridPointDict, sectionPointDict, spliceLayout, spliceSectionList) {
    const section = 2;
    let result = { parent: [], children: [] };
    for (let i = 0; i < spliceLayout.length; i++) {
        for (let j = 0; j < spliceLayout[i].length; j++) {
            let gridkey = "G" + (i + 1).toFixed(0) + "SP" + (j + 1).toFixed(0); //vStiffLayout[i][position];
            let sPliceName = spliceLayout[i][j][section];
            let sPliceSection = spliceSectionList[sPliceName];
            if (sPliceSection) {
                let sectionPoint = sectionPointDict[gridkey].forward;
                let sectionID =
                    sectionPoint.input.wuf.toFixed(0) +
                    sectionPoint.input.wlf.toFixed(0) +
                    sectionPoint.input.tlf.toFixed(0) +
                    sectionPoint.input.tuf.toFixed(0) +
                    sectionPoint.input.tw.toFixed(0);
                if (spliceFnMap[sPliceName]) {
                    let dia = spliceFnMap[sPliceName](sectionPoint, gridPointDict[gridkey], sPliceSection, gridkey, sPliceName);
                    result["children"].push(...dia.children);

                    sectionID;
                    dia.parent[0].id = sectionID + dia.parent[0].id;
                    result["parent"].push(...dia.parent);
                }
            }
        }
    }
    return result;
}

const spliceFnMap = {
    현장이음1: function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) {
        return GenSplicePlate(sectionPoint, gridPoint, spSection, gridKey, sPliceName);
    },
    현장이음2: function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) {
        return GenSplicePlate(sectionPoint, gridPoint, spSection, gridKey, sPliceName);
    },
    현장이음3: function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) {
        return GenSplicePlate(sectionPoint, gridPoint, spSection, gridKey, sPliceName);
    },
    현장이음4: function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) {
        return GenSplicePlate(sectionPoint, gridPoint, spSection, gridKey, sPliceName);
    },
};

export function GenSplicePlate(iSectionPoint, iPoint, spliceSection, gridkey, sPliceName) {
    let result = { parent: [], children: [] };
    let upperFlangeOutter = { nb: 0, n: 0 };
    let upperFlangeInner = [];
    let lowerFlangeOutter = { nb: 0, n: 0 };
    let lowerFlangeInner = [];

    let webSidePoints = [];
    let webSideBoltPoints = [];
    let TopPlateModels = [];
    let BottomPlateModels = [];
    let topBoltPoints = [];
    let bottomBoltPoints = [];

    let web = { nb: 0 };
    let sp = {
        //sectionPoint변수
        webThickness: iSectionPoint.input.tw,
        uflangeWidth: iSectionPoint.input.wuf,
        lflangeWidth: iSectionPoint.input.luf,
        uflangeThickness: iSectionPoint.input.tuf,
        lflangeThickness: iSectionPoint.input.tlf,
        webJointHeight: iSectionPoint.input.H - 100,
        // UribThickness: iSectionPoint.input.Urib.thickness,
        // lribThickness: iSectionPoint.input.Lrib.thickness,
    };
    //margin2 : 플랜지 이음판의 종방향 부재(종리브, 웹)와의 이격거리
    // let spliceSection = {
    //   "webJointThickness": 20,
    //   "webJointWidth": 600,
    //   "uflangeJointThickness": 20,
    //   "lflangeJointThickness": 20,
    //   "uflangeJointLength": 600,
    //   "lflangeJointLength": 600,
    //   "margin2": 20,
    //   "uRibJointHeight" : 110,
    //   "uRibJointLength" : 600,
    //   "uRibJointThickness" : 10,
    //   "lRibJointHeight" : 110,
    //   "lRibJointLength" : 600,
    //   "lRibJointThickness" : 10,
    //   "webBoltPitch" : 100,
    //   "webBoltGauge" : 100,
    //   "webBoltDia" : 22,
    //   "flangeBoltPitch" : 75,
    //   "flangeBoltGauge" : 75,
    //   "flangeBoltDia" : 22
    // }

    let wBolt = {
        P: spliceSection.webBoltPitch,
        G: spliceSection.webBoltGauge,
        size: 37, //향후 볼트 데이터베이스 구축해서 자동으로 입력
        dia: spliceSection.webBoltDia,
        t: 14,
    };

    let fBolt = {
        P: spliceSection.flangeBoltPitch,
        G: spliceSection.flangeBoltGauge,
        size: 37,
        dia: spliceSection.flangeBoltDia,
        t: 14,
    };
    let gradient = (iSectionPoint.web[1][1].y - iSectionPoint.web[0][1].y) / (iSectionPoint.web[1][1].x - iSectionPoint.web[0][1].x);
    let WebPlate = [
        { x: -sp.webJointHeight / 2, y: -spliceSection.webJointWidth / 2 },
        { x: -sp.webJointHeight / 2, y: spliceSection.webJointWidth / 2 },
        { x: sp.webJointHeight / 2, y: spliceSection.webJointWidth / 2 },
        { x: sp.webJointHeight / 2, y: -spliceSection.webJointWidth / 2 },
    ];
    let WebBolt = {
        P: wBolt.P,
        G: wBolt.G,
        size: wBolt.size,
        dia: wBolt.dia,
        t: wBolt.t,
        l: spliceSection.webJointThickness * 2 + sp.webThickness,
        layout: BoltLayout(wBolt.G, wBolt.P, "x", WebPlate),
        isUpper: true,
    };
    let BoltInfo = {};
    BoltInfo["web"] = BoltLayoutInfo(wBolt.G, wBolt.P, "x", WebPlate, spliceSection.webJointThickness);
    web["b"] = sp.webJointHeight;
    web["h"] = spliceSection.webJointWidth;
    web["t"] = spliceSection.webJointThickness;
    let iNode = [iSectionPoint.web[0][0], iSectionPoint.web[1][0]];
    let jNode = [iSectionPoint.web[0][1], iSectionPoint.web[1][1]];
    let lcp = { x: (iNode[0].x + jNode[0].x) / 2, y: (iNode[0].y + jNode[0].y) / 2 };
    let rcp = { x: (iNode[1].x + jNode[1].x) / 2, y: (iNode[1].y + jNode[1].y) / 2 };
    let cp = (-gradient / 2) * lcp.x + lcp.y;
    for (let i = 0; i < 2; i++) {
        // let iNode = iSectionPoint.web[i][0]
        // let jNode = iSectionPoint.web[i][1]
        let centerPoint = i === 0 ? ToGlobalPoint(iPoint, lcp) : ToGlobalPoint(iPoint, rcp);
        let lWebAngle = Math.PI - Math.atan((jNode[i].y - iNode[i].y) / (jNode[i].x - iNode[i].x));
        let partName = "webJoint";
        let side2D = i === 1 ? cp - rcp.y : false;
        // result[partName + (i * 2 + 1).toString()] = hPlateGenV2(Web, centerPoint, spliceSection.webJointThickness, sp.webThickness, 90, 0, lWebAngle, null, false, side2D)
        let webModel = hPlateGenV2(WebPlate, centerPoint, spliceSection.webJointThickness, sp.webThickness, 90, 0, lWebAngle, null, false, side2D);

        if (side2D || side2D === 0) {
            webSidePoints = webModel["model"]["sideView"];
            webSideBoltPoints.push(...boltSidePoints(WebBolt, centerPoint, lWebAngle, side2D));
        }

        result["children"].push({
            ...webModel,
            meta: { part: gridkey, key: partName + (i * 2 + 1).toString() },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
        });
        // result[partName + (i * 2 + 1).toString()].bolt = WebBolt;
        // result[partName + (i * 2 + 1).toString() + "bolt"] = {
        let model = i === 1 ? { sideView: boltSideView(WebBolt, centerPoint, lWebAngle, side2D) } : {};

        result["children"].push({
            type: "bolt",
            meta: { part: gridkey, key: partName + (i * 2 + 1).toString() + "bolt" },
            bolt: WebBolt,
            Thickness: spliceSection.webJointThickness,
            zPosition: sp.webThickness,
            rotationY: lWebAngle,
            rotationX: 0,
            point: centerPoint,
            model: model,
            get threeFunc() {
                return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
            },
        });
        // result[partName + (i * 2 + 2).toString()] = hPlateGenV2(Web, centerPoint, spliceSection.webJointThickness, - spliceSection.webJointThickness, 90, 0, lWebAngle, null, false, false)
        result["children"].push({
            ...hPlateGenV2(
                WebPlate,
                centerPoint,
                spliceSection.webJointThickness,
                -spliceSection.webJointThickness,
                90,
                0,
                lWebAngle,
                null,
                false,
                false
            ),
            meta: { part: gridkey, key: partName + (i * 2 + 2).toString() },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
        });
    }

    let uPoint = { x: 0, y: -iSectionPoint.web[0][1].x * gradient + iSectionPoint.web[0][1].y };
    let centerPoint = ToGlobalPoint(iPoint, uPoint);

    if (iSectionPoint.uflange[2].length > 0) {
        //폐합
        let lx1 = Math.sqrt((iSectionPoint.web[0][1].x - uPoint.x) ** 2 + (iSectionPoint.web[0][1].y - uPoint.y) ** 2);
        let lx2 = Math.sqrt((iSectionPoint.web[1][1].x - uPoint.x) ** 2 + (iSectionPoint.web[1][1].y - uPoint.y) ** 2);
        let sec = (lx1 + lx2) / (iSectionPoint.web[1][1].x - iSectionPoint.web[0][1].x);
        let TopFlange = [
            { x: -lx1 - iSectionPoint.input.buf, y: -spliceSection.uflangeJointLength / 2 },
            { x: -lx1 - iSectionPoint.input.buf, y: spliceSection.uflangeJointLength / 2 },
            { x: lx2 + iSectionPoint.input.buf, y: spliceSection.uflangeJointLength / 2 },
            { x: lx2 + iSectionPoint.input.buf, y: -spliceSection.uflangeJointLength / 2 },
        ];
        let side2D = [0, 1];
        let keyName = "cTop";
        // result[keyName] = hPlateGenV2(TopFlange, centerPoint, spliceSection.uflangeJointThickness, sp.uflangeThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, true, side2D, false)
        result["children"].push({
            ...hPlateGenV2SideView(
                TopFlange,
                centerPoint,
                spliceSection.uflangeJointThickness,
                sp.uflangeThickness,
                90,
                Math.atan(iPoint.gradientX),
                -Math.atan(gradient),
                null,
                true,
                side2D,
                false
            ),
            meta: { part: gridkey, key: keyName },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
        });
        upperFlangeOutter["b"] = Math.abs(TopFlange[0].x - TopFlange[2].x);
        upperFlangeOutter["h"] = Math.abs(TopFlange[0].y - TopFlange[2].y);
        upperFlangeOutter["t"] = spliceSection.uflangeJointThickness;

        let xList = [-lx1 - iSectionPoint.input.buf, -lx1 - sp.webThickness - spliceSection.margin2, -lx1 + spliceSection.margin2];
        let uRibJoint = [
            { y: -spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height },
            { y: spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height },
            { y: spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height - spliceSection.uRibJointHeight },
            { y: -spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height - spliceSection.uRibJointHeight },
        ];
        for (let i in iSectionPoint.input.Urib.layout) {
            let uRibPoint = ToGlobalPoint(iPoint, {
                x: iSectionPoint.input.Urib.layout[i],
                y: uPoint.y + gradient * iSectionPoint.input.Urib.layout[i],
            });
            // result["uRibJoint" + (i * 2 + 1).toString()] = hPlateGenV2(uRibJoint, uRibPoint, spliceSection.uRibJointThickness, iSectionPoint.input.Urib.thickness / 2, 90, Math.atan(iPoint.gradientX), Math.PI / 2, null, false)
            result["children"].push({
                ...hPlateGenV2(
                    uRibJoint,
                    uRibPoint,
                    spliceSection.uRibJointThickness,
                    iSectionPoint.input.Urib.thickness / 2,
                    90,
                    Math.atan(iPoint.gradientX),
                    Math.PI / 2,
                    null,
                    false
                ),
                meta: { part: gridkey, key: "uRibJoint" + (i * 2 + 1).toString() },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });
            let uRibBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uRibJointThickness + iSectionPoint.input.Urib.thickness,
                layout: BoltLayout(fBolt.G, fBolt.P, "x", uRibJoint),
                isUpper: true,
            };
            // result["uRibJoint" + (i * 2 + 1).toString()].bolt = uRibBolt;
            // result["uRibJoint" + (i * 2 + 1).toString() + "bolt"] = {
            result["children"].push({
                type: "bolt",
                meta: { part: gridkey, key: "uRibJoint" + (i * 2 + 1).toString() + "bolt" },
                bolt: uRibBolt,
                Thickness: spliceSection.uRibJointThickness,
                zPosition: iSectionPoint.input.Urib.thickness / 2,
                rotationY: Math.PI / 2,
                rotationX: Math.atan(iPoint.gradientX),
                point: uRibPoint,
                get threeFunc() {
                    return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
            // result["uRibJoint" + (i * 2 + 2).toString()] = hPlateGenV2(uRibJoint, uRibPoint, spliceSection.uRibJointThickness, -spliceSection.uRibJointThickness - iSectionPoint.input.Urib.thickness / 2, 90, Math.atan(iPoint.gradientX), Math.PI / 2, null, false)
            result["children"].push({
                ...hPlateGenV2(
                    uRibJoint,
                    uRibPoint,
                    spliceSection.uRibJointThickness,
                    -spliceSection.uRibJointThickness - iSectionPoint.input.Urib.thickness / 2,
                    90,
                    Math.atan(iPoint.gradientX),
                    Math.PI / 2,
                    null,
                    false
                ),
                meta: { part: gridkey, key: "uRibJoint" + (i * 2 + 2).toString() },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });
            xList.push((iSectionPoint.input.Urib.layout[i] - iSectionPoint.input.Urib.thickness / 2) * sec - spliceSection.margin2);
            xList.push((iSectionPoint.input.Urib.layout[i] + iSectionPoint.input.Urib.thickness / 2) * sec + spliceSection.margin2);
        }
        xList.push(lx2 - spliceSection.margin2, lx2 + sp.webThickness + spliceSection.margin2, lx2 + iSectionPoint.input.buf);
        for (let i = 0; i < xList.length; i += 2) {
            keyName = "cTopI" + i;
            let TopFlange2 = [
                { x: xList[i], y: -spliceSection.uflangeJointLength / 2 },
                { x: xList[i], y: spliceSection.uflangeJointLength / 2 },
                { x: xList[i + 1], y: spliceSection.uflangeJointLength / 2 },
                { x: xList[i + 1], y: -spliceSection.uflangeJointLength / 2 },
            ];
            side2D = i === 0 ? [0, 1] : null;
            // result[keyName] = hPlateGenV2(TopFlange2, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, side2D, false)
            let model = hPlateGenV2SideView(
                TopFlange2,
                centerPoint,
                spliceSection.uflangeJointThickness,
                -spliceSection.uflangeJointThickness,
                90,
                Math.atan(iPoint.gradientX),
                -Math.atan(gradient),
                null,
                false,
                side2D,
                false
            );
            TopPlateModels.push(model);
            result["children"].push({
                ...model,
                meta: { part: gridkey, key: keyName },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });

            let topBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
                layout: BoltLayout(fBolt.G, fBolt.P, "x", TopFlange2),
                isUpper: false,
                isTop: true,
            };
            BoltInfo[keyName + "bolt"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", TopFlange2, spliceSection.uflangeJointThickness);
            // result[keyName].bolt = topBolt;
            // result[keyName + "bolt"] = {
            topBoltPoints.push(boltPlanPoints(topBolt, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)));
            result["children"].push({
                type: "bolt",
                meta: { part: gridkey, key: keyName + "bolt" },
                bolt: topBolt,
                Thickness: spliceSection.uflangeJointThickness,
                zPosition: -spliceSection.uflangeJointThickness,
                rotationY: -Math.atan(gradient),
                rotationX: Math.atan(iPoint.gradientX),
                point: centerPoint,
                model: { topView: boltPlanView(topBolt, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)) },
                get threeFunc() {
                    return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
        }
    } else {
        // 개구
        for (let i = 0; i < 2; i++) {
            let lx = Math.sqrt((iSectionPoint.web[i][1].x - uPoint.x) ** 2 + (iSectionPoint.web[i][1].y - uPoint.y) ** 2);
            let sign = i === 0 ? -1 : 1;
            let TopFlange = [
                { x: sign * (lx + iSectionPoint.input.buf), y: -spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.buf), y: spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.buf - iSectionPoint.input.wuf), y: spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.buf - iSectionPoint.input.wuf), y: -spliceSection.uflangeJointLength / 2 },
            ];

            let keyName = i === 0 ? "lTop" : "rTop";
            let side2D = i === 0 ? [0, 1] : null;
            // result[keyName] = hPlateGenV2(TopFlange, centerPoint, spliceSection.uflangeJointThickness, sp.uflangeThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, true, side2D, false)
            result["children"].push({
                ...hPlateGenV2SideView(
                    TopFlange,
                    centerPoint,
                    spliceSection.uflangeJointThickness,
                    sp.uflangeThickness,
                    90,
                    Math.atan(iPoint.gradientX),
                    -Math.atan(gradient),
                    null,
                    true,
                    side2D,
                    false
                ),
                meta: { part: gridkey, key: keyName },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });
            if (i === 0) {
                upperFlangeOutter["b"] = Math.abs(TopFlange[0].x - TopFlange[2].x);
                upperFlangeOutter["h"] = Math.abs(TopFlange[0].y - TopFlange[2].y);
                upperFlangeOutter["t"] = spliceSection.uflangeJointThickness;
            }

            let TopFlange2 = [
                { x: sign * (lx + iSectionPoint.input.buf), y: -spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.buf), y: spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: -spliceSection.uflangeJointLength / 2 },
            ];
            let TopFlange3 = [
                { x: sign * (lx - spliceSection.margin2), y: -spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx - spliceSection.margin2), y: spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.buf - iSectionPoint.input.wuf), y: spliceSection.uflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.buf - iSectionPoint.input.wuf), y: -spliceSection.uflangeJointLength / 2 },
            ];

            // result[keyName + "2"] = hPlateGenV2(TopFlange2, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, side2D, false)
            let model2 = hPlateGenV2SideView(
                TopFlange2,
                centerPoint,
                spliceSection.uflangeJointThickness,
                -spliceSection.uflangeJointThickness,
                90,
                Math.atan(iPoint.gradientX),
                -Math.atan(gradient),
                null,
                false,
                side2D,
                false
            );
            TopPlateModels.push(model2);
            result["children"].push({
                ...model2,
                meta: { part: gridkey, key: keyName + "2" },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });

            let topBolt2 = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
                layout: BoltLayout(fBolt.G, fBolt.P, "x", TopFlange2),
                isUpper: false,
                isTop: true,
            };
            // result[keyName + "2"].bolt = topBolt2;
            // result[keyName + "bolt2"] = {
            BoltInfo[keyName + "bolt2"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", TopFlange2, spliceSection.uflangeJointThickness);
            topBoltPoints.push(boltPlanPoints(topBolt2, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)));
            result["children"].push({
                type: "bolt",
                meta: { part: gridkey, key: keyName + "bolt2" },
                bolt: topBolt2,
                Thickness: spliceSection.uflangeJointThickness,
                zPosition: -spliceSection.uflangeJointThickness,
                rotationY: -Math.atan(gradient),
                rotationX: Math.atan(iPoint.gradientX),
                point: centerPoint,
                model: { topView: boltPlanView(topBolt2, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)) },
                get threeFunc() {
                    return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
            // result[keyName + "3"] = hPlateGenV2(TopFlange3, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, null, false)
            let model3 = hPlateGenV2SideView(
                TopFlange3,
                centerPoint,
                spliceSection.uflangeJointThickness,
                -spliceSection.uflangeJointThickness,
                90,
                Math.atan(iPoint.gradientX),
                -Math.atan(gradient),
                null,
                false,
                null,
                false
            );
            TopPlateModels.push(model3);
            result["children"].push({
                ...model3,
                meta: { part: gridkey, key: keyName + "3" },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });
            let topBolt3 = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
                layout: BoltLayout(fBolt.G, fBolt.P, "x", TopFlange3),
                isUpper: false,
                isTop: true,
            };
            BoltInfo[keyName + "bolt3"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", TopFlange3, spliceSection.uflangeJointThickness);
            // result[keyName + "3"].bolt = topBolt3;
            // result[keyName + "bolt3"] = {
            topBoltPoints.push(boltPlanPoints(topBolt3, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)));
            result["children"].push({
                type: "bolt",
                meta: { part: gridkey, key: keyName + "bolt3" },
                bolt: topBolt3,
                Thickness: spliceSection.uflangeJointThickness,
                zPosition: -spliceSection.uflangeJointThickness,
                rotationY: -Math.atan(gradient),
                rotationX: Math.atan(iPoint.gradientX),
                point: centerPoint,
                model: { topView: boltPlanView(topBolt3, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)) },
                get threeFunc() {
                    return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
        }
    }

    let lPoint = { x: 0, y: iSectionPoint.web[0][0].y };
    centerPoint = ToGlobalPoint(iPoint, lPoint);
    let bXRad = Math.atan(iPoint.gradientX + iSectionPoint.input.gradientlf);

    if (iSectionPoint.lflange[2].length > 0) {
        //폐합
        let lx1 = Math.sqrt((iSectionPoint.web[0][0].x - lPoint.x) ** 2 + (iSectionPoint.web[0][0].y - lPoint.y) ** 2);
        let lx2 = Math.sqrt((iSectionPoint.web[1][0].x - lPoint.x) ** 2 + (iSectionPoint.web[1][0].y - lPoint.y) ** 2);
        let sec = 1; // (lx1 + lx2) / (iSectionPoint.web[1][1].x - iSectionPoint.web[0][1].x) //제형단면의 경우 종리브가 깊이에 비례해서 간격이 바뀔경우를 고려
        let BottomFlange = [
            { x: -lx1 - iSectionPoint.input.blf, y: -spliceSection.lflangeJointLength / 2 },
            { x: -lx1 - iSectionPoint.input.blf, y: spliceSection.lflangeJointLength / 2 },
            { x: lx2 + iSectionPoint.input.blf, y: spliceSection.uflangeJointLength / 2 },
            { x: lx2 + iSectionPoint.input.blf, y: -spliceSection.uflangeJointLength / 2 },
        ];
        let side2D = [0, 1];
        let keyName = "cBottom";
        result["children"].push({
            ...hPlateGenV2(
                BottomFlange,
                centerPoint,
                spliceSection.lflangeJointThickness,
                -sp.lflangeThickness - spliceSection.lflangeJointThickness,
                90,
                bXRad,
                0,
                null,
                false,
                side2D,
                false
            ),
            meta: { part: gridkey, key: keyName },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
        });
        lowerFlangeOutter["b"] = Math.abs(BottomFlange[0].x - BottomFlange[2].x);
        lowerFlangeOutter["h"] = Math.abs(BottomFlange[0].y - BottomFlange[2].y);
        lowerFlangeOutter["t"] = spliceSection.lflangeJointThickness;

        let xList = [-lx1 - iSectionPoint.input.blf, -lx1 - sp.webThickness - spliceSection.margin2, -lx1 + spliceSection.margin2];
        let lRibJoint = [
            { y: -spliceSection.lRibJointLength / 2, x: iSectionPoint.input.Lrib.height },
            { y: spliceSection.lRibJointLength / 2, x: iSectionPoint.input.Lrib.height },
            { y: spliceSection.lRibJointLength / 2, x: iSectionPoint.input.Lrib.height - spliceSection.lRibJointHeight },
            { y: -spliceSection.lRibJointLength / 2, x: iSectionPoint.input.Lrib.height - spliceSection.lRibJointHeight },
        ];

        for (let i in iSectionPoint.input.Lrib.layout) {
            let lRibPoint = ToGlobalPoint(iPoint, { x: iSectionPoint.input.Lrib.layout[i], y: lPoint.y });
            // result["lRibJoint" + (i * 2 + 1).toString()] = hPlateGenV2(lRibJoint, lRibPoint, spliceSection.lRibJointThickness, iSectionPoint.input.Lrib.thickness / 2, 90, bXRad, -Math.PI / 2, null, false)
            result["children"].push({
                ...hPlateGenV2(
                    lRibJoint,
                    lRibPoint,
                    spliceSection.lRibJointThickness,
                    iSectionPoint.input.Lrib.thickness / 2,
                    90,
                    bXRad,
                    -Math.PI / 2,
                    null,
                    false
                ),
                meta: { part: gridkey, key: "lRibJoint" + (i * 2 + 1).toString() },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });

            let lRibBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lRibJointThickness + iSectionPoint.input.Lrib.thickness,
                layout: BoltLayout(fBolt.G, fBolt.P, "x", lRibJoint),
                isUpper: true,
            };
            // result["lRibJoint" + (i * 2 + 1).toString()].bolt = lRibBolt;
            // result["lRibJoint" + (i * 2 + 1).toString() + "bolt"] = {
            result["children"].push({
                type: "bolt",
                meta: { part: gridkey, key: "lRibJoint" + (i * 2 + 1).toString() + "bolt" },
                bolt: lRibBolt,
                Thickness: spliceSection.lRibJointThickness,
                zPosition: iSectionPoint.input.Lrib.thickness / 2,
                rotationY: -Math.PI / 2,
                rotationX: bXRad,
                point: lRibPoint,
                get threeFunc() {
                    return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
            // result["lRibJoint" + (i * 2 + 2).toString()] = hPlateGenV2(lRibJoint, lRibPoint, spliceSection.lRibJointThickness, -spliceSection.lRibJointThickness - iSectionPoint.input.Lrib.thickness / 2, 90, bXRad, -Math.PI / 2, null, false)
            result["children"].push({
                ...hPlateGenV2(
                    lRibJoint,
                    lRibPoint,
                    spliceSection.lRibJointThickness,
                    -spliceSection.lRibJointThickness - iSectionPoint.input.Lrib.thickness / 2,
                    90,
                    bXRad,
                    -Math.PI / 2,
                    null,
                    false
                ),
                meta: { part: gridkey, key: "lRibJoint" + (i * 2 + 2).toString() },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });
            xList.push((iSectionPoint.input.Lrib.layout[i] - iSectionPoint.input.Lrib.thickness / 2) * sec - spliceSection.margin2);
            xList.push((iSectionPoint.input.Lrib.layout[i] + iSectionPoint.input.Lrib.thickness / 2) * sec + spliceSection.margin2);
        }
        xList.push(lx2 - spliceSection.margin2, lx2 + sp.webThickness + spliceSection.margin2, lx2 + iSectionPoint.input.blf);
        for (let i = 0; i < xList.length; i += 2) {
            keyName = "cBottomI" + i;
            let BottomFlange2 = [
                { x: xList[i], y: -spliceSection.lflangeJointLength / 2 },
                { x: xList[i], y: spliceSection.lflangeJointLength / 2 },
                { x: xList[i + 1], y: spliceSection.lflangeJointLength / 2 },
                { x: xList[i + 1], y: -spliceSection.lflangeJointLength / 2 },
            ];
            side2D = i === 0 ? [0, 1] : null;
            // result[keyName] = hPlateGenV2(BottomFlange2, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, side2D, true)
            let model = hPlateGenV2SideView(
                BottomFlange2,
                centerPoint,
                spliceSection.lflangeJointThickness,
                0,
                90,
                bXRad,
                0,
                null,
                false,
                side2D,
                true
            );
            BottomPlateModels.push(model);
            result["children"].push({
                ...model,
                meta: { part: gridkey, key: keyName },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });

            let bottomBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
                layout: BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2),
                isUpper: true,
                isTop: false,
            };
            BoltInfo[keyName + "bolt"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", BottomFlange2, spliceSection.lflangeJointThickness);
            // result[keyName].bolt = bottomBolt;
            bottomBoltPoints.push(boltPlanPoints(bottomBolt, centerPoint, bXRad, 0));
            result["children"].push({
                type: "bolt",
                meta: { part: gridkey, key: keyName + "bolt" },
                bolt: bottomBolt,
                Thickness: spliceSection.lflangeJointThickness,
                zPosition: 0,
                rotationY: 0,
                rotationX: bXRad,
                point: centerPoint,
                model: { bottomView: boltPlanView(bottomBolt, centerPoint, bXRad, 0) },
                get threeFunc() {
                    return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
        }
    } else {
        // 개구
        for (let i = 0; i < 2; i++) {
            let lx = Math.sqrt((iSectionPoint.web[i][0].x - lPoint.x) ** 2 + (iSectionPoint.web[i][0].y - lPoint.y) ** 2);
            let sign = i === 0 ? -1 : 1;
            let BottomFlange = [
                { x: sign * (lx + iSectionPoint.input.blf), y: -spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.blf), y: spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.blf - iSectionPoint.input.wlf), y: spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.blf - iSectionPoint.input.wlf), y: -spliceSection.lflangeJointLength / 2 },
            ];
            let keyName = i === 0 ? "lBottom" : "rBottom";
            let side2D = i === 0 ? [0, 1] : null;
            // result[keyName] = hPlateGenV2(BottomFlange, centerPoint, spliceSection.lflangeJointThickness, - sp.lflangeThickness - spliceSection.lflangeJointThickness, 90, bXRad, 0, null, false, side2D)
            result["children"].push({
                ...hPlateGenV2SideView(
                    BottomFlange,
                    centerPoint,
                    spliceSection.lflangeJointThickness,
                    -sp.lflangeThickness - spliceSection.lflangeJointThickness,
                    90,
                    bXRad,
                    0,
                    null,
                    false,
                    side2D
                ),
                meta: { part: gridkey, key: keyName },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });
            if (i === 0) {
                lowerFlangeOutter["b"] = Math.abs(BottomFlange[0].x - BottomFlange[2].x);
                lowerFlangeOutter["h"] = Math.abs(BottomFlange[0].y - BottomFlange[2].y);
                lowerFlangeOutter["t"] = spliceSection.lflangeJointThickness;
            }
            let BottomFlange2 = [
                { x: sign * (lx + iSectionPoint.input.blf), y: -spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.blf), y: spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: -spliceSection.lflangeJointLength / 2 },
            ];
            let BottomFlange3 = [
                { x: sign * (lx - spliceSection.margin2), y: -spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx - spliceSection.margin2), y: spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.blf - iSectionPoint.input.wlf), y: spliceSection.lflangeJointLength / 2 },
                { x: sign * (lx + iSectionPoint.input.blf - iSectionPoint.input.wlf), y: -spliceSection.lflangeJointLength / 2 },
            ];
            // result[keyName + "2"] = hPlateGenV2(BottomFlange2, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, side2D, true)
            let model2 = hPlateGenV2SideView(
                BottomFlange2,
                centerPoint,
                spliceSection.lflangeJointThickness,
                0,
                90,
                bXRad,
                0,
                null,
                false,
                side2D,
                true
            );
            BottomPlateModels.push(model2);
            result["children"].push({
                ...model2,
                meta: { part: gridkey, key: keyName + "2" },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });

            let bottomBolt2 = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
                layout: BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2),
                isUpper: true,
                isTop: false,
            };
            BoltInfo[keyName + "bolt2"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", BottomFlange2, spliceSection.lflangeJointThickness);
            // result[keyName + "2"].bolt = bottomBolt2
            bottomBoltPoints.push(boltPlanPoints(bottomBolt2, centerPoint, bXRad, 0));
            result["children"].push({
                type: "bolt",
                meta: { part: gridkey, key: keyName + "bolt2" },
                bolt: bottomBolt2,
                Thickness: spliceSection.lflangeJointThickness,
                zPosition: 0,
                rotationY: 0,
                rotationX: bXRad,
                point: centerPoint,
                model: { bottomView: boltPlanView(bottomBolt2, centerPoint, bXRad, 0) },
                get threeFunc() {
                    return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
            // result[keyName + "3"] = hPlateGenV2(BottomFlange3, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, null, true)
            let model3 = hPlateGenV2SideView(
                BottomFlange3,
                centerPoint,
                spliceSection.lflangeJointThickness,
                0,
                90,
                bXRad,
                0,
                null,
                false,
                null,
                true
            );
            BottomPlateModels.push(model3);
            result["children"].push({
                ...model3,
                meta: { part: gridkey, key: keyName + "3" },
                properties: {},
                weld: {},
                textLabel: {},
                dimension: {},
            });
            let bottomBolt3 = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
                layout: BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange3),
                isUpper: true,
                isTop: false,
            };
            BoltInfo[keyName + "bolt"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", BottomFlange3, spliceSection.lflangeJointThickness);
            // result[keyName + "3"].bolt = bottomBolt3
            bottomBoltPoints.push(boltPlanPoints(bottomBolt3, centerPoint, bXRad, 0));
            result["children"].push({
                type: "bolt",
                meta: { part: gridkey, key: keyName + "bolt3" },
                bolt: bottomBolt3,
                Thickness: spliceSection.lflangeJointThickness,
                zPosition: 0,
                rotationY: 0,
                rotationX: bXRad,
                point: centerPoint,
                model: { bottomView: boltPlanView(bottomBolt3, centerPoint, bXRad, 0) },
                get threeFunc() {
                    return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
        }
    }
    for (let boltKey in BoltInfo) {
        if (boltKey.includes("Top")) {
            upperFlangeOutter["nb"] += BoltInfo[boltKey].nb;
            upperFlangeOutter["nh"] = BoltInfo[boltKey].nh;
            upperFlangeOutter["n"] += 1;
            upperFlangeOutter["s"] = 2 * spliceSection.margin2;
            upperFlangeInner.push(BoltInfo[boltKey]);
        } else if (boltKey.includes("Bottom")) {
            lowerFlangeOutter["nb"] += BoltInfo[boltKey].nb;
            lowerFlangeOutter["nh"] = BoltInfo[boltKey].nh;
            lowerFlangeOutter["n"] += 1;
            lowerFlangeOutter["s"] = 2 * spliceSection.margin2;
            lowerFlangeInner.push(BoltInfo[boltKey]);
        } else {
            //only web
            web = BoltInfo[boltKey];
        }
    }
    let dummyTopPts = [];
    let dummyTopPtsR = [];
    let dummyBottomPts = [];
    let dummyBottomPtsR = [];
    let topLeftDimPoints = []; //모델이 대칭이라 마지막 좌표가 안측에 놓이게 됨, 하부도 마찬가지
    for (let i in TopPlateModels) {
        // topLeftDimPoints.push(ToGlobalPoint2(iPoint, TopPlateModels[i]["points"][0]))
        // topLeftDimPoints.push(ToGlobalPoint2(iPoint, TopPlateModels[i]["points"][3]))
        dummyTopPts.push(TopPlateModels[i]["points"][0], TopPlateModels[i]["points"][3]);
        dummyTopPtsR.push(TopPlateModels[i]["points"][1], TopPlateModels[i]["points"][2]);
    }
    dummyTopPts.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    dummyTopPtsR.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    dummyTopPts.forEach(pt => topLeftDimPoints.push(ToGlobalPoint2(iPoint, pt)));

    let topRightDimPoints = [
        //모델상에 마지막 좌표를 찾아야함
        ToGlobalPoint2(iPoint, dummyTopPtsR[0]),
        ToGlobalPoint2(iPoint, dummyTopPtsR[dummyTopPtsR.length - 1]),
    ];
    topBoltPoints.forEach(el => topRightDimPoints.push(...el));
    let bottomLeftDimPoints = [];
    for (let i in BottomPlateModels) {
        dummyBottomPts.push(BottomPlateModels[i]["points"][0], BottomPlateModels[i]["points"][3]);
        dummyBottomPtsR.push(BottomPlateModels[i]["points"][1], BottomPlateModels[i]["points"][2]);
        // bottomLeftDimPoints.push(BottomPlateModels[i]["model"]["bottomView"][0])
        // bottomLeftDimPoints.push(BottomPlateModels[i]["model"]["bottomView"][3])
    }
    dummyBottomPts.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    dummyBottomPtsR.sort(function (a, b) {
        return a.x < b.x ? -1 : 1;
    });
    dummyBottomPts.forEach(pt => bottomLeftDimPoints.push(ToGlobalPoint2(iPoint, pt)));

    let bottomRightDimPoints = [
        ToGlobalPoint2(iPoint, dummyBottomPtsR[0]),
        ToGlobalPoint2(iPoint, dummyBottomPtsR[dummyTopPtsR.length - 1]),
        // BottomPlateModels[0]["model"]["bottomView"][1],
        // BottomPlateModels[BottomPlateModels.length - 1]["model"]["bottomView"][2],
    ];
    bottomBoltPoints.forEach(el => bottomRightDimPoints.push(...el));
    let sideTopDimPoints = [webSidePoints[2], webSidePoints[3], ...webSideBoltPoints];
    let sideBottomDimPoints = [webSidePoints[0], webSidePoints[1], ...webSideBoltPoints];

    let sideLeftDimPoints = [webSidePoints[0], webSidePoints[3], ...webSideBoltPoints];
    let sideRightDimPoints = [webSidePoints[1], webSidePoints[2], ...webSideBoltPoints];
    let topIndex = sideTopDimPoints[0].y > sideTopDimPoints[sideTopDimPoints.length - 1].y ? true : false;
    let bottomIndex = sideBottomDimPoints[0].y < sideBottomDimPoints[sideBottomDimPoints.length - 1].y ? true : false;

    result["parent"].push({
        part: gridkey,
        id:
            sPliceName +
            iSectionPoint.web[0][0].x.toFixed(0) +
            iSectionPoint.web[0][0].y.toFixed(0) +
            iSectionPoint.web[0][1].x.toFixed(0) +
            iSectionPoint.web[0][1].y.toFixed(0) +
            iSectionPoint.web[1][0].x.toFixed(0) +
            iSectionPoint.web[1][0].y.toFixed(0) +
            iSectionPoint.web[1][1].x.toFixed(0) +
            iSectionPoint.web[1][1].y.toFixed(0) +
            (iSectionPoint.input.isSeparated ? "P" : "B"),
        point: iPoint,
        //계산서 변수 추가 필요
        sectionName: sPliceName,
        shape: iSectionPoint.input.isSeparated ? "plate" : "box",
        properties: {
            upperFlangeOutter,
            upperFlangeInner,
            lowerFlangeOutter,
            lowerFlangeInner,
            web,
            bolt: { name: "F13T", D: spliceSection.webBoltDia },
        },
        dimension: {
            sideView: [
                {
                    type: "DIMALIGN",
                    points: [sideTopDimPoints[0], sideTopDimPoints[1]],
                    index: 0,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 2,
                },
                {
                    type: "DIMALIGN",
                    points: sideTopDimPoints,
                    index: topIndex ? 0 : sideTopDimPoints.length - 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 1,
                },
                {
                    type: "DIMALIGN",
                    points: [sideBottomDimPoints[0], sideBottomDimPoints[1]],
                    index: 0,
                    isHorizontal: true,
                    isTopOrRight: false,
                    offsetIndex: 2,
                },
                { type: "DIMALIGN", points: sideBottomDimPoints, index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 1 },
                {
                    type: "DIMALIGN",
                    points: [sideLeftDimPoints[0], sideLeftDimPoints[1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: sideLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                { type: "DIMALIGN", points: sideRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
                {
                    type: "DIMALIGN",
                    points: [sideRightDimPoints[0], sideRightDimPoints[1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
            ],
            topView: [
                {
                    type: "DIMALIGN",
                    points: [topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 5,
                },
                { type: "DIMALIGN", points: topLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
                {
                    type: "DIMALIGN",
                    points: [topRightDimPoints[0], topRightDimPoints[1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
            bottomView: [
                {
                    type: "DIMALIGN",
                    points: [bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 5,
                },
                { type: "DIMALIGN", points: bottomLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
                {
                    type: "DIMALIGN",
                    points: [bottomRightDimPoints[0], bottomRightDimPoints[1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: bottomRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
        },
    });

    return result;
}

export function GenIBeamJointDict(webPoints, centerPoint, xs, wBolt, fBolt, meta) {
    // webPoint는 반드시 좌측하단을 시작으로 시계반대방향순이어야함
    let result = {};
    const rotationY = centerPoint.skew - Math.PI / 2;
    let uGradient = (webPoints[3].y - webPoints[2].y) / (webPoints[3].x - webPoints[2].x);
    let lGradient = (webPoints[1].y - webPoints[0].y) / (webPoints[1].x - webPoints[0].x);
    let uRad = -Math.atan(uGradient);
    let lRad = -Math.atan(lGradient);

    // TODO: 로직 확인 후 루프 함수로 변환 필요
    let refCenterPoint = GetRefPoint(centerPoint);
    let origin1 = { x: (webPoints[0].x + webPoints[3].x) / 2, y: (webPoints[0].y + webPoints[3].y) / 2 };
    let origin2 = { x: (webPoints[1].x + webPoints[2].x) / 2, y: (webPoints[1].y + webPoints[2].y) / 2 };
    let webCoord1 = PointToGlobal(origin1, refCenterPoint);
    let webCoord2 = PointToGlobal(origin2, refCenterPoint);
    let webPoint1 = { ...refCenterPoint, ...webCoord1 };
    let webPoint2 = { ...refCenterPoint, ...webCoord2 };
    let webJoint1 = [
        { x: -xs.webJointWidth / 2, y: -xs.webJointHeight / 2 },
        { x: xs.webJointWidth / 2, y: -xs.webJointHeight / 2 },
        { x: xs.webJointWidth / 2, y: xs.webJointHeight / 2 },
        { x: -xs.webJointWidth / 2, y: xs.webJointHeight / 2 },
    ];

    let webJoint2D1 = TranslateBoltPoints(origin1, webJoint1);
    let WebBolt = {
        P: wBolt.P,
        G: wBolt.G,
        size: wBolt.size,
        dia: wBolt.dia,
        t: wBolt.t,
        l: xs.webJointThickness * 2 + xs.webThickness,
        layout: BoltLayout(wBolt.G, wBolt.P, "Y", webJoint1),
        isUpper: true,
    };

    result["webJoint1"] = GenHPlate(
        webJoint1,
        webPoint1,
        xs.webJointThickness,
        xs.webThickness / 2,
        Math.PI / 2,
        Math.PI / 2,
        rotationY,
        webJoint2D1,
        null,
        null,
        null,
        null
    );
    result["webBolt1"] = {
        type: "bolt",
        bolt: WebBolt,
        Thickness: xs.webJointThickness,
        zPosition: xs.webThickness / 2,
        rotationY: rotationY,
        rotationX: Math.PI / 2,
        point: webPoint1,
        model: { sectionView: GenBoltSectionDraw(WebBolt, origin1) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    result["webJoint2"] = GenHPlate(
        webJoint1,
        webPoint1,
        xs.webJointThickness,
        -xs.webJointThickness - xs.webThickness / 2,
        Math.PI / 2,
        Math.PI / 2,
        rotationY,
        null,
        null,
        null,
        null,
        null,
        { ...meta, key: "webJoint2" }
    );

    // let webJoint2D3 = PointToGlobal(webJoint1, new RefPoint({ ...origin2 }, { x: 1, y: 0, z: 0 }, 0));
    let webJoint2D3 = TranslateBoltPoints(origin2, webJoint1);
    result["webJoint3"] = GenHPlate(
        webJoint1,
        webPoint2,
        xs.webJointThickness,
        xs.webThickness / 2,
        Math.PI / 2,
        Math.PI / 2,
        rotationY,
        webJoint2D3,
        null,
        null,
        null,
        null,
        { ...meta, key: "webJoint3" }
    );
    // result["webJoint3"]["bolt"] = WebBolt
    result["webBolt2"] = {
        type: "bolt",
        bolt: WebBolt,
        Thickness: xs.webJointThickness,
        zPosition: xs.webThickness / 2,
        rotationY: rotationY,
        rotationX: Math.PI / 2,
        point: webPoint2,
        model: { sectionView: GenBoltSectionDraw(WebBolt, origin2) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    result["webJoint4"] = GenHPlate(
        webJoint1,
        webPoint2,
        xs.webJointThickness,
        -xs.webJointThickness - xs.webThickness / 2,
        Math.PI / 2,
        Math.PI / 2,
        rotationY,
        null,
        null,
        null,
        null,
        null,
        { ...meta, key: "webJoint4" }
    );

    // flange Joint
    let joint2D = [
        { x: -xs.flangeJointLength / 2, y: 0 },
        { x: xs.flangeJointLength / 2, y: 0 },
        { x: xs.flangeJointLength / 2, y: xs.flangeJointThickness },
        { x: -xs.flangeJointLength / 2, y: xs.flangeJointThickness },
    ];
    let joint1 = [
        { x: -xs.flangeJointLength / 2, y: -xs.flangeWidth / 2 },
        { x: xs.flangeJointLength / 2, y: -xs.flangeWidth / 2 },
        { x: xs.flangeJointLength / 2, y: xs.flangeWidth / 2 },
        { x: -xs.flangeJointLength / 2, y: xs.flangeWidth / 2 },
    ];
    let joint2 = [
        { x: -xs.flangeJointLength / 2, y: -xs.flangeWidth / 2 },
        { x: xs.flangeJointLength / 2, y: -xs.flangeWidth / 2 },
        { x: xs.flangeJointLength / 2, y: -xs.flangeWidth / 2 + xs.flangeJointWidth },
        { x: -xs.flangeJointLength / 2, y: -xs.flangeWidth / 2 + xs.flangeJointWidth },
    ];
    let joint3 = [
        { x: -xs.flangeJointLength / 2, y: xs.flangeWidth / 2 },
        { x: xs.flangeJointLength / 2, y: xs.flangeWidth / 2 },
        { x: xs.flangeJointLength / 2, y: xs.flangeWidth / 2 - xs.flangeJointWidth },
        { x: -xs.flangeJointLength / 2, y: xs.flangeWidth / 2 - xs.flangeJointWidth },
    ];

    let uflangeBolt = {
        P: fBolt.P,
        G: fBolt.G,
        size: fBolt.size,
        dia: fBolt.dia,
        t: fBolt.t,
        l: xs.flangeJointThickness * 2 + xs.flangeThickness,
        layout: BoltLayout(fBolt.G, fBolt.P, "y", joint2, centerPoint.skew),
        isUpper: false,
        isTop: true,
    };
    let uflangeBolt2 = {
        P: fBolt.P,
        G: fBolt.G,
        size: fBolt.size,
        dia: fBolt.dia,
        t: fBolt.t,
        l: xs.flangeJointThickness * 2 + xs.flangeThickness,
        layout: BoltLayout(fBolt.G, fBolt.P, "y", joint3, centerPoint.skew),
        isUpper: false,
        isTop: true,
    };
    let lflangeBolt = {
        P: fBolt.P,
        G: fBolt.G,
        size: fBolt.size,
        dia: fBolt.dia,
        t: fBolt.t,
        l: xs.flangeJointThickness * 2 + xs.flangeThickness,
        layout: BoltLayout(fBolt.G, fBolt.P, "y", joint2, centerPoint.skew),
        isUpper: true,
        isTop: false,
    };
    let lflangeBolt2 = {
        P: fBolt.P,
        G: fBolt.G,
        size: fBolt.size,
        dia: fBolt.dia,
        t: fBolt.t,
        l: xs.flangeJointThickness * 2 + xs.flangeThickness,
        layout: BoltLayout(fBolt.G, fBolt.P, "y", joint3, centerPoint.skew),
        isUpper: true,
        isTop: false,
    };

    let uCoord1 = PointToGlobal(webPoints[3], refCenterPoint);
    let uCoord2 = PointToGlobal(webPoints[2], refCenterPoint);
    let uPoint1 = { ...refCenterPoint, ...uCoord1 };
    let uPoint2 = { ...refCenterPoint, ...uCoord2 };

    result["upperJoint1"] = GenHPlateForSplice(
        joint1,
        uPoint1,
        xs.flangeJointThickness,
        xs.flangeThickness,
        centerPoint.skew,
        0,
        uRad,
        TranslateBoltPoints(webPoints[3], joint2D, xs.flangeThickness, -uRad),
        true,
        null,
        null,
        { ...meta, key: "upperJoint1" }
    );

    result["upperJoint2"] = GenHPlateForSplice(
        joint2,
        uPoint1,
        xs.flangeJointThickness,
        -xs.flangeJointThickness,
        centerPoint.skew,
        0,
        uRad,
        TranslateBoltPoints(webPoints[3], joint2D, -xs.flangeJointThickness, -uRad),
        null,
        null,
        null,
        { ...meta, key: "upperJoint2" }
    );
    result["upperJointBolt1"] = {
        type: "bolt",
        bolt: uflangeBolt,
        Thickness: xs.flangeJointThickness,
        zPosition: -xs.flangeJointThickness,
        rotationY: uRad,
        rotationX: 0,
        point: { ...uPoint1, zRotation: uPoint1.zRotation + Math.PI / 2 },
        model: { topView: GenBoltPlanDraw(uflangeBolt, uPoint1, 0, uRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    result["upperJoint3"] = GenHPlateForSplice(
        joint3,
        uPoint1,
        xs.flangeJointThickness,
        -xs.flangeJointThickness,
        centerPoint.skew,
        0,
        uRad,
        null,
        null,
        null,
        { ...meta, key: "upperJoint3" }
    );
    result["upperJointBolt2"] = {
        type: "bolt",
        bolt: uflangeBolt2,
        Thickness: xs.flangeJointThickness,
        zPosition: -xs.flangeJointThickness,
        rotationY: uRad,
        rotationX: 0,
        point: { ...uPoint1, zRotation: uPoint1.zRotation + Math.PI / 2 },
        model: { topView: GenBoltPlanDraw(uflangeBolt2, uPoint1, 0, uRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    result["upperJoint11"] = GenHPlateForSplice(
        joint1,
        uPoint2,
        xs.flangeJointThickness,
        xs.flangeThickness,
        centerPoint.skew,
        0,
        uRad,
        TranslateBoltPoints(webPoints[2], joint2D, xs.flangeThickness, -uRad),
        true,
        null,
        null,
        { ...meta, key: "upperJoint11" }
    );
    result["upperJoint22"] = GenHPlateForSplice(
        joint2,
        uPoint2,
        xs.flangeJointThickness,
        -xs.flangeJointThickness,
        centerPoint.skew,
        0,
        uRad,
        TranslateBoltPoints(webPoints[2], joint2D, -xs.flangeJointThickness, -uRad),
        null,
        null,
        null,
        { ...meta, key: "upperJoint22" }
    );
    result["upperJointBolt3"] = {
        type: "bolt",
        bolt: uflangeBolt,
        Thickness: xs.flangeJointThickness,
        zPosition: -xs.flangeJointThickness,
        rotationY: uRad,
        rotationX: 0,
        point: { ...uPoint2, zRotation: uPoint2.zRotation + Math.PI / 2 },
        model: { topView: GenBoltPlanDraw(uflangeBolt, uPoint2, 0, uRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    result["upperJoint33"] = GenHPlateForSplice(
        joint3,
        uPoint2,
        xs.flangeJointThickness,
        -xs.flangeJointThickness,
        centerPoint.skew,
        0,
        uRad,
        null,
        null,
        null,
        null,
        { ...meta, key: "upperJoint33" }
    );
    result["upperJointBolt4"] = {
        type: "bolt",
        bolt: uflangeBolt2,
        Thickness: xs.flangeJointThickness,
        zPosition: -xs.flangeJointThickness,
        rotationY: uRad,
        rotationX: 0,
        point: { ...uPoint2, zRotation: uPoint2.zRotation + Math.PI / 2 },
        model: { topView: GenBoltPlanDraw(uflangeBolt2, uPoint2, 0, uRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };

    let lCoord1 = PointToGlobal(webPoints[0], refCenterPoint);
    let lCoord2 = PointToGlobal(webPoints[1], refCenterPoint);
    let lPoint1 = { ...refCenterPoint, ...lCoord1 };
    let lPoint2 = { ...refCenterPoint, ...lCoord2 };
    result["lowerJoint1"] = GenHPlateForSplice(
        joint1,
        lPoint1,
        xs.flangeJointThickness,
        -xs.flangeThickness - xs.flangeJointThickness,
        centerPoint.skew,
        0,
        lRad,
        TranslateBoltPoints(webPoints[0], joint2D, -xs.flangeThickness - xs.flangeJointThickness, -lRad),
        false,
        null,
        true,
        { ...meta, key: "lowerJoint1" }
    );
    result["lowerJoint2"] = GenHPlateForSplice(joint2, lPoint1, xs.flangeJointThickness, 0, centerPoint.skew, 0, lRad, null, null, null, null, {
        ...meta,
        key: "lowerJoint2",
    });
    result["lowerJointBolt1"] = {
        type: "bolt",
        bolt: lflangeBolt,
        Thickness: xs.flangeJointThickness,
        zPosition: 0,
        rotationY: lRad,
        rotationX: 0,
        point: { ...lPoint1, zRotation: lPoint1.zRotation + Math.PI / 2 },
        model: { bottomView: GenBoltPlanDraw(lflangeBolt, lPoint1, 0, lRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    result["lowerJoint3"] = GenHPlateForSplice(
        joint3,
        lPoint1,
        xs.flangeJointThickness,
        0,
        centerPoint.skew,
        0,
        lRad,
        TranslateBoltPoints(webPoints[0], joint2D, 0, -lRad),
        null,
        null,
        null,
        { ...meta, key: "lowerJoint3" }
    );
    result["lowerJointBolt2"] = {
        type: "bolt",
        bolt: lflangeBolt2,
        Thickness: xs.flangeJointThickness,
        zPosition: 0,
        rotationY: lRad,
        rotationX: 0,
        point: { ...lPoint1, zRotation: lPoint1.zRotation + Math.PI / 2 },
        model: { bottomView: GenBoltPlanDraw(lflangeBolt2, lPoint1, 0, lRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    result["lowerJoint11"] = GenHPlateForSplice(
        joint1,
        lPoint2,
        xs.flangeJointThickness,
        -xs.flangeThickness - xs.flangeJointThickness,
        centerPoint.skew,
        0,
        lRad,
        TranslateBoltPoints(webPoints[1], joint2D, -xs.flangeThickness - xs.flangeJointThickness, -lRad),
        false,
        null,
        true,
        { ...meta, key: "lowerJoint11" }
    );
    result["lowerJoint22"] = GenHPlateForSplice(joint2, lPoint2, xs.flangeJointThickness, 0, centerPoint.skew, 0, lRad, null, null, null, null, {
        ...meta,
        key: "lowerJoint22",
    });
    result["lowerJointBolt3"] = {
        type: "bolt",
        bolt: lflangeBolt,
        Thickness: xs.flangeJointThickness,
        zPosition: 0,
        rotationY: lRad,
        rotationX: 0,
        point: { ...lPoint2, zRotation: lPoint2.zRotation + Math.PI / 2 },
        model: { bottomView: GenBoltPlanDraw(lflangeBolt, lPoint2, 0, lRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    result["lowerJoint33"] = GenHPlateForSplice(
        joint3,
        lPoint2,
        xs.flangeJointThickness,
        0,
        centerPoint.skew,
        0,
        lRad,
        TranslateBoltPoints(webPoints[1], joint2D, 0, -lRad),
        null,
        null,
        null,
        { ...meta, key: "lowerJoint33" }
    );
    result["lowerJointBolt4"] = {
        type: "bolt",
        bolt: lflangeBolt2,
        Thickness: xs.flangeJointThickness,
        zPosition: 0,
        rotationY: lRad,
        rotationX: 0,
        point: { ...lPoint2, zRotation: lPoint2.zRotation + Math.PI / 2 },
        model: { bottomView: GenBoltPlanDraw(lflangeBolt2, lPoint2, 0, lRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    /////////////////////////////////// to the function //////////////////////////////////////////
    return result;
}

function GenHPlateForSplice(points, refCenterPoint, thickness, z, skew, rotationX, rotationY, points2D, top2D, side2D, bottom2D, meta = {}) {
    const cosec = 1 / Math.sin(skew);
    const cot = -1 / Math.tan(skew);
    const rot = skew - Math.PI / 2;
    const gcos = Math.cos(rot);
    const gsin = Math.sin(rot);
    let cos = Math.cos(rotationY);
    let cosx = Math.cos(rotationX);
    let resultPoints = [];
    let topView = null;
    let bottomView = null;
    let sideView = null;

    points.forEach(pt => resultPoints.push({ x: pt.x * gcos - pt.y * gsin, y: pt.x * gsin + pt.y * gcos }));
    if (top2D) {
        topView = [];
        if (rotationY < Math.PI / 2 && rotationY > -Math.PI / 2) {
            resultPoints.forEach(function (pt) {
                let gpt = ToGlobalPoint2(refCenterPoint, { x: pt.x * cos, y: pt.y * cosx });
                topView.push({ x: gpt.x, y: gpt.y });
            });
        } else if (rotationY === Math.PI / 2 || rotationY === -Math.PI / 2) {
            let gpt = PointToGlobal({ x: resultPoints[0].x * cos, y: 0 }, refCenterPoint);
            for (let i = 0; i < 4; i++) {
                let sign = rotationY > 0 ? 1 : -1;
                let th = i < 2 ? resultPoints[0].y * cosx : resultPoints[3].y * cosx;
                let dx = refCenterPoint.normalSin * th;
                let dy = refCenterPoint.normalCos * th;
                let dx2 = 0 < i && i < 3 ? sign * refCenterPoint.normalCos * z : sign * refCenterPoint.normalCos * (z + thickness);
                let dy2 = 0 < i && i < 3 ? sign * refCenterPoint.normalSin * z : sign * refCenterPoint.normalSin * (z + thickness);
                topView.push({ x: gpt.x - dx + dx2, y: gpt.y + dy + dy2 });
            }
        }
    }

    if (bottom2D) {
        bottomView = [];
        if (rotationY < Math.PI / 2 && rotationY > -Math.PI / 2) {
            resultPoints.forEach(function (pt) {
                let gpt = ToGlobalPoint2(refCenterPoint, { x: pt.x * cos, y: pt.y * cosx });
                // let th = pt.y * cosx;
                // let dx = refCenterPoint.normalSin * th;
                // let dy = refCenterPoint.normalCos * th;
                bottomView.push({ x: gpt.x, y: gpt.y });
            });
        } else if (rotationY === Math.PI / 2 || rotationY === -Math.PI / 2) {
            let gpt = PointToGlobal({ x: resultPoints[0].x * cos, y: 0 }, refCenterPoint);
            for (let i = 0; i < 4; i++) {
                let sign = rotationY > 0 ? 1 : -1;
                let th = i < 2 ? resultPoints[0].y * cosx : resultPoints[3].y * cosx;
                let dx = refCenterPoint.normalSin * th;
                let dy = refCenterPoint.normalCos * th;
                let dx2 = 0 < i && i < 3 ? sign * refCenterPoint.normalCos * z : sign * refCenterPoint.normalCos * (z + thickness);
                let dy2 = 0 < i && i < 3 ? sign * refCenterPoint.normalSin * z : sign * refCenterPoint.normalSin * (z + thickness);
                bottomView.push({ x: gpt.x - dx + dx2, y: gpt.y + dy + dy2 });
            }
        }
    }

    if (side2D || side2D === 0) {
        let cos = Math.cos(rotationX);
        let sin = Math.sin(rotationX);
        sideView = [];
        if (rotationY < Math.PI / 4 && rotationY > -Math.PI / 4) {
            let x1 = points[side2D[0]].y;
            let x2 = points[side2D[1]].y;
            let X = refCenterPoint.girderStation;
            let Y = refCenterPoint.z; //refCenterPoint.dz? refCenterPoint.dz: 0; //;
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
            let X = refCenterPoint.girderStation;
            let Y = dz + refCenterPoint.z; //refCenterPoint.dz? dz + refCenterPoint.dz: dz
            points.forEach(pt => sideView.push({ x: X + pt.y, y: Y + pt.x * Math.sin(rotationY) }));
        }
    }

    let option = {
        refPoint: { ...refCenterPoint, z: refCenterPoint.z + thickness / 2 + z, xRotation: rotationX, yRotation: rotationY },
        holes: [],
    };
    let materialName = "Steel";
    let result = new Extrude_rev(resultPoints, thickness, option, materialName, meta);
    result.model = { sectionView: points2D, topView, sideView, bottomView };
    return result;
}

function GenBoltPlanDraw(bolt, centerPoint, rotationX, rotationY, meta = {}) {
    let result = [];
    let cos = Math.cos(rotationY);
    let cosx = Math.cos(rotationX);
    let boltDia = bolt.dia;
    let rot = Math.atan2(centerPoint.normalCos, -centerPoint.normalSin);
    let lcos = Math.cos(rot);
    let lsin = Math.sin(rot);
    let pts = [];
    for (let k in bolt.layout) {
        let x = bolt.layout[k][0];
        let y = bolt.layout[k][1];
        let gpt = ToGlobalPoint2(centerPoint, { x: x * cos, y: y * cosx });
        pts.push({ x: gpt.x, y: gpt.y });
    }
    pts.forEach(function (pt) {
        result.push(
            new Line(
                [
                    { x: pt.x + lcos * boltDia, y: pt.y + lsin * boltDia },
                    { x: pt.x - lcos * boltDia, y: pt.y - lsin * boltDia },
                ],
                "RED",
                false,
                null,
                meta
            )
        );
        result.push(
            new Line(
                [
                    { x: pt.x - lsin * boltDia, y: pt.y + lcos * boltDia },
                    { x: pt.x + lsin * boltDia, y: pt.y - lcos * boltDia },
                ],
                "RED",
                false,
                null,
                meta
            )
        );
    });
    pts.forEach(function (pt) {
        result.push(new Circle(pt, boltDia / 2, "GREEN", 16, meta));
    });
    return result;
}

function GenBoltSectionDraw(bolt, centerPoint, meta = {}) {
    let result = [];
    let boltDia = bolt.dia;
    let cp = centerPoint; //{ x: (children[i].points2D[0].x + children[i].points2D[2].x) / 2, y: (children[i].points2D[0].y + children[i].points2D[2].y) / 2 }
    for (let k in bolt.layout) {
        let pt = {
            x: cp.x + bolt.layout[k][0],
            y: cp.y + bolt.layout[k][1],
        };
        result.push(
            new Line(
                [
                    { x: pt.x + boltDia, y: pt.y },
                    { x: pt.x - boltDia, y: pt.y },
                ],
                "RED",
                false,
                null,
                meta
            )
        );
        result.push(
            new Line(
                [
                    { x: pt.x, y: pt.y + boltDia },
                    { x: pt.x, y: pt.y - boltDia },
                ],
                "RED",
                false,
                null,
                meta
            )
        );
        result.push(new Circle(pt, boltDia / 2, "GREEN", 16, meta));
    }

    return result;
}

// TODO: 함수의 의도 확인 후 네이밍 검토
function BoltLayout(x, y, axis, platePoints, skew) {
    let result = [];
    let rot = 0;
    if (skew) {
        rot = ((skew - 90) * Math.PI) / 180;
    }
    let cos = Math.cos(rot);
    let sin = Math.sin(rot);
    // 볼트배치 자동계산 모듈 // 2020.7.7 by drlim
    let cp = {
        x: (platePoints[0].x + platePoints[2].x) / 2,
        y: (platePoints[0].y + platePoints[2].y) / 2,
    };
    let lx = Math.abs(platePoints[2].x - platePoints[0].x);
    let ly = Math.abs(platePoints[2].y - platePoints[0].y);
    let dx, dy, xNum, yNum, yEnd, xEnd;

    if (axis === "x") {
        ly = ly / 2;
    } else {
        lx = lx / 2;
    }
    yNum = Math.floor(ly / y);
    xNum = Math.floor(lx / x);
    if (xNum < 1) {
        xNum += 1;
        xEnd = (lx % x) / 2;
    } else {
        xEnd = (x + (lx % x)) / 2;
    }
    if (yNum < 1) {
        yNum += 1;
        yEnd = (ly % y) / 2;
    } else {
        yEnd = (y + (ly % y)) / 2;
    }
    for (let i = 0; i < xNum; i++) {
        for (let j = 0; j < yNum; j++) {
            for (let l = 0; l < 2; l++) {
                if (axis === "x") {
                    dx = 0;
                    dy = l == 0 ? ly / 2 : -ly / 2;
                } else {
                    dx = l === 0 ? lx / 2 : -lx / 2;
                    dy = 0;
                }
                let xtranslate = cp.x + dx + lx / 2 - xEnd - i * x; // pitch와 gage개념 다시 확인(분절면을 기준으로)
                let ytranslate = cp.y + dy + ly / 2 - yEnd - j * y;
                result.push([xtranslate * cos - ytranslate * sin, xtranslate * sin + ytranslate * cos]);
            }
        }
    }
    return result;
}

function TranslateBoltPoints(origin, points, yoffset, radian) {
    let result = [];
    let yoff = yoffset ? yoffset : 0;
    if (radian) {
        let cos = Math.cos(radian);
        let sin = Math.sin(radian);
        points.forEach(pt => result.push({ x: origin.x + cos * pt.x - sin * (pt.y + yoff), y: origin.y + sin * pt.x + cos * (pt.y + yoff) }));
    } else {
        points.forEach(pt => result.push({ x: origin.x + pt.x, y: origin.y + (pt.y + yoff) }));
    }

    return result;
}
