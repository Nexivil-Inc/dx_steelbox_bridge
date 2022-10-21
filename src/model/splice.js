import { Circle, Extrude, GetRefPoint, Line, PointToGlobal, RefPoint } from "@nexivil/package-modules";
import { GenBoltGeometry } from "./geometry";
import { GenHPlate, GenHPlate_rev, ToGlobalPoint2 } from "./utils";

export function GenSpliceModelFn(gridPointDict, sectionPointDict, spliceLayout, spliceSectionList) {
    const section = 2;
    let result = { parent: [], children: [] };
    for (let i = 0; i < spliceLayout.length; i++) {
        for (let j = 0; j < spliceLayout[i].length; j++) {
            let gridKey = "G" + (i + 1).toFixed(0) + "SP" + (j + 1).toFixed(0); //vStiffLayout[i][position];
            let sPliceName = spliceLayout[i][j][section];
            let sPliceSection = spliceSectionList[sPliceName];
            if (sPliceSection) {
                let sectionPoint = sectionPointDict[gridKey].forward;
                let sectionID =
                    sectionPoint.input.wuf.toFixed(0) +
                    sectionPoint.input.wlf.toFixed(0) +
                    sectionPoint.input.tlf.toFixed(0) +
                    sectionPoint.input.tuf.toFixed(0) +
                    sectionPoint.input.tw.toFixed(0);
                if (spliceFnMap[sPliceName]) {
                    let splice = spliceFnMap[sPliceName](sectionPoint, gridPointDict[gridKey], sPliceSection, gridKey, sPliceName);
                    result["children"].push(...splice.children);

                    // sectionID;
                    // dia.parent[0].id = sectionID + dia.parent[0].id;
                    // result["parent"].push(...dia.parent);
                }
            }
        }
    }
    return { model: result };
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

export function GenSplicePlate(sectionInfo, stPoint, spliceSection, gridKey, sPliceName) {
    let result = { parent: [], children: [] };
    let xRotation = stPoint.gradientX;

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
        webThickness: sectionInfo.input.tw,
        uflangeWidth: sectionInfo.input.wuf,
        lflangeWidth: sectionInfo.input.luf,
        uflangeThickness: sectionInfo.input.tuf,
        lflangeThickness: sectionInfo.input.tlf,
        webJointHeight: sectionInfo.input.H - 100,
        // UribThickness: iSectionPoint.input.Urib.thickness,
        // lribThickness: iSectionPoint.input.Lrib.thickness,
    };
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
    let gradient = (sectionInfo.web[1][1].y - sectionInfo.web[0][1].y) / (sectionInfo.web[1][1].x - sectionInfo.web[0][1].x);
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
        layout: GetBoltLayout(wBolt.G, wBolt.P, "x", WebPlate),
        isUpper: true,
    };
    let BoltInfo = {};
    BoltInfo["web"] = GetSectionLayout(wBolt.G, wBolt.P, "x", WebPlate, spliceSection.webJointThickness);
    web["b"] = sp.webJointHeight;
    web["h"] = spliceSection.webJointWidth;
    web["t"] = spliceSection.webJointThickness;
    let iNode = [sectionInfo.web[0][0], sectionInfo.web[1][0]];
    let jNode = [sectionInfo.web[0][1], sectionInfo.web[1][1]];
    let lcp = { x: (iNode[0].x + jNode[0].x) / 2, y: (iNode[0].y + jNode[0].y) / 2, z: 0 };
    let rcp = { x: (iNode[1].x + jNode[1].x) / 2, y: (iNode[1].y + jNode[1].y) / 2, z: 0 };
    let cp = (-gradient / 2) * lcp.x + lcp.y;

    /* Web model */
    for (let i = 0; i < 2; i++) {
        let centerPoint = i === 0 ? PointToGlobal(lcp, stPoint) : PointToGlobal(rcp, stPoint);
        let lWebAngle = Math.PI - Math.atan((jNode[i].y - iNode[i].y) / (jNode[i].x - iNode[i].x));
        // let lr = i === 0 ? "left" : "right";
        // let partName = "webJoint";
        // let side2D = i === 1 ? cp - rcp.y : false;

        let webJoint1Model = GenHPlate_rev(WebPlate, centerPoint, spliceSection.webJointThickness, sp.webThickness, 0, 0, lWebAngle);
        webJoint1Model.meta = { ...webJoint1Model.meta, part: gridKey, key: "Joint-web" };
        result["children"].push(webJoint1Model);

        let webJoint2Model = GenHPlate(WebPlate, centerPoint, spliceSection.webJointThickness, -spliceSection.webJointThickness, 0, 0, lWebAngle);
        webJoint2Model.meta = { ...webJoint2Model.meta, part: gridKey, key: "Joint-web" };
        result["children"].push(webJoint2Model);

        // let model = i === 1 ? { sideView: boltSideView(WebBolt, centerPoint, lWebAngle, side2D) } : {};
        result["children"].push({
            type: "bolt",
            // meta: { part: gridKey, key: partName + (i * 2 + 1).toString() + "bolt", material: "Bolt" },
            meta: { part: gridKey, key: "Bolt-web", material: "Bolt" },
            bolt: WebBolt,
            Thickness: spliceSection.webJointThickness,
            zPosition: sp.webThickness,
            rotationY: lWebAngle,
            rotationX: 0,
            point: centerPoint,
            // model: model,
            get threeFunc() {
                return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
            },
        });

        // // if (side2D || side2D === 0) {
        // //     webSidePoints = webModel["model"]["sideView"];
        // //     webSideBoltPoints.push(...boltSidePoints(WebBolt, centerPoint, lWebAngle, side2D));
        // // }
    }

    /* Upper splice model */
    let uPoint = { x: 0, y: -sectionInfo.web[0][1].x * gradient + sectionInfo.web[0][1].y };
    let centerPoint = PointToGlobal(uPoint, stPoint);
    if (sectionInfo.uflange[2].length > 0) {
        //폐합
        let lx1 = Math.sqrt((sectionInfo.web[0][1].x - uPoint.x) ** 2 + (sectionInfo.web[0][1].y - uPoint.y) ** 2);
        let lx2 = Math.sqrt((sectionInfo.web[1][1].x - uPoint.x) ** 2 + (sectionInfo.web[1][1].y - uPoint.y) ** 2);
        let sec = (lx1 + lx2) / (sectionInfo.web[1][1].x - sectionInfo.web[0][1].x);
        let TopFlange = [
            { x: -lx1 - sectionInfo.input.buf, y: -spliceSection.uflangeJointLength / 2 },
            { x: -lx1 - sectionInfo.input.buf, y: spliceSection.uflangeJointLength / 2 },
            { x: lx2 + sectionInfo.input.buf, y: spliceSection.uflangeJointLength / 2 },
            { x: lx2 + sectionInfo.input.buf, y: -spliceSection.uflangeJointLength / 2 },
        ];
        let side2D = [0, 1];
        let keyName = "cTop";

        let ufOutterModel = GenHPlate_rev(
            TopFlange,
            centerPoint,
            spliceSection.uflangeJointThickness,
            sp.uflangeThickness,
            0,
            Math.atan(stPoint.gradientX),
            -Math.atan(gradient)
        );
        ufOutterModel.meta = { ...ufOutterModel.meta, part: gridKey, key: "Joint-uf-outter" };
        result["children"].push(ufOutterModel);

        upperFlangeOutter["b"] = Math.abs(TopFlange[0].x - TopFlange[2].x);
        upperFlangeOutter["h"] = Math.abs(TopFlange[0].y - TopFlange[2].y);
        upperFlangeOutter["t"] = spliceSection.uflangeJointThickness;

        let xList = [-lx1 - sectionInfo.input.buf, -lx1 - sp.webThickness - spliceSection.margin2, -lx1 + spliceSection.margin2];
        let uRibJoint = [
            { y: -spliceSection.uRibJointLength / 2, x: sectionInfo.input.Urib.height },
            { y: spliceSection.uRibJointLength / 2, x: sectionInfo.input.Urib.height },
            { y: spliceSection.uRibJointLength / 2, x: sectionInfo.input.Urib.height - spliceSection.uRibJointHeight },
            { y: -spliceSection.uRibJointLength / 2, x: sectionInfo.input.Urib.height - spliceSection.uRibJointHeight },
        ];
        for (let i in sectionInfo.input.Urib.layout) {
            let uRibShape = {
                x: sectionInfo.input.Urib.layout[i],
                y: uPoint.y + gradient * sectionInfo.input.Urib.layout[i],
            };
            let uRibPoint = PointToGlobal(uRibShape, stPoint);
            let uRibRightModel = GenHPlate_rev(
                uRibJoint,
                uRibPoint,
                spliceSection.uRibJointThickness,
                sectionInfo.input.Urib.thickness / 2,
                0,
                Math.atan(stPoint.gradientX),
                Math.PI / 2
            );
            uRibRightModel.meta = { ...uRibRightModel.meta, part: gridKey, key: "Joint-urib" };
            result["children"].push(uRibRightModel);

            let uRibLeftModel = GenHPlate_rev(
                uRibJoint,
                uRibPoint,
                spliceSection.uRibJointThickness,
                -spliceSection.uRibJointThickness - sectionInfo.input.Urib.thickness / 2,
                Math.PI / 2,
                Math.atan(stPoint.gradientX),
                Math.PI / 2
            );
            uRibLeftModel.meta = { ...uRibLeftModel.meta, part: gridKey, key: "Joint-urib" };
            result["children"].push(uRibLeftModel);

            let uRibBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uRibJointThickness + sectionInfo.input.Urib.thickness,
                layout: GetBoltLayout(fBolt.G, fBolt.P, "x", uRibJoint),
                isUpper: true,
            };
            result["children"].push({
                type: "bolt",
                meta: { material: "Bolt", part: gridKey, key: "Bolt-urib" },
                bolt: uRibBolt,
                Thickness: spliceSection.uRibJointThickness,
                zPosition: sectionInfo.input.Urib.thickness / 2,
                rotationY: Math.PI / 2,
                rotationX: Math.atan(stPoint.gradientX),
                point: uRibPoint,
                get threeFunc() {
                    return InitPoint =>
                        GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });

            // uRibJointModel.meta = result["children"].push({
            //     ...GenHPlate(
            //         uRibJoint,
            //         uRibPoint,
            //         spliceSection.uRibJointThickness,
            //         -spliceSection.uRibJointThickness - sectionInfo.input.Urib.thickness / 2,
            //         90,
            //         Math.atan(stPoint.gradientX),
            //         Math.PI / 2,
            //         null,
            //         false
            //     ),
            //     meta: { part: gridKey, key: "uRibJoint" + (i * 2 + 2).toString() },
            //     properties: {},
            //     weld: {},
            //     textLabel: {},
            //     dimension: {},
            // });
            xList.push((sectionInfo.input.Urib.layout[i] - sectionInfo.input.Urib.thickness / 2) * sec - spliceSection.margin2);
            xList.push((sectionInfo.input.Urib.layout[i] + sectionInfo.input.Urib.thickness / 2) * sec + spliceSection.margin2);
        }
        xList.push(lx2 - spliceSection.margin2, lx2 + sp.webThickness + spliceSection.margin2, lx2 + sectionInfo.input.buf);

        for (let i = 0; i < xList.length; i += 2) {
            keyName = "cTopI" + i;
            let TopFlange2 = [
                { x: xList[i], y: -spliceSection.uflangeJointLength / 2 },
                { x: xList[i], y: spliceSection.uflangeJointLength / 2 },
                { x: xList[i + 1], y: spliceSection.uflangeJointLength / 2 },
                { x: xList[i + 1], y: -spliceSection.uflangeJointLength / 2 },
            ];
            let ufInner1Model = GenHPlate_rev(
                TopFlange2,
                centerPoint,
                spliceSection.uflangeJointThickness,
                -spliceSection.uflangeJointThickness,
                0,
                Math.atan(stPoint.gradientX),
                -Math.atan(gradient)
            );
            ufInner1Model.meta = { ...ufInner1Model.meta, part: gridKey, key: "Joint-uf-Inner" };
            result["children"].push(ufInner1Model);

            // side2D = i === 0 ? [0, 1] : null;
            // let model = GenHPlate(
            //     TopFlange2,
            //     centerPoint,
            //     spliceSection.uflangeJointThickness,
            //     -spliceSection.uflangeJointThickness,
            //     Math.PI / 2,
            //     Math.atan(stPoint.gradientX),
            //     -Math.atan(gradient),
            //     null,
            //     false,
            //     side2D,
            //     false
            // );
            // TopPlateModels.push(model);
            // result["children"].push({
            //     ...model,
            //     meta: { part: gridKey, key: keyName },
            //     properties: {},
            //     weld: {},
            //     textLabel: {},
            //     dimension: {},
            // });
            let topBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
                layout: GetBoltLayout(fBolt.G, fBolt.P, "x", TopFlange2),
                isUpper: false,
                isTop: true,
            };
            BoltInfo[keyName + "bolt"] = GetSectionLayout(fBolt.G, fBolt.P, "x", TopFlange2, spliceSection.uflangeJointThickness);
            result["children"].push({
                type: "bolt",
                // meta: { material: "Bolt", part: gridKey, key: keyName + "bolt" },
                meta: { material: "Bolt", part: gridKey, key: "Bolt-uf" },
                bolt: topBolt,
                Thickness: spliceSection.uflangeJointThickness,
                zPosition: -spliceSection.uflangeJointThickness,
                rotationY: -Math.atan(gradient),
                rotationX: Math.atan(stPoint.gradientX),
                point: centerPoint,
                get threeFunc() {
                    return InitPoint =>
                        GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
        }
    }
    // else {
    //     // 개구
    //     for (let i = 0; i < 2; i++) {
    //         let lx = Math.sqrt((sectionInfo.web[i][1].x - uPoint.x) ** 2 + (sectionInfo.web[i][1].y - uPoint.y) ** 2);
    //         let sign = i === 0 ? -1 : 1;
    //         let TopFlange = [
    //             { x: sign * (lx + sectionInfo.input.buf), y: -spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.buf), y: spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.buf - sectionInfo.input.wuf), y: spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.buf - sectionInfo.input.wuf), y: -spliceSection.uflangeJointLength / 2 },
    //         ];

    //         let keyName = i === 0 ? "lTop" : "rTop";
    //         let side2D = i === 0 ? [0, 1] : null;
    //         let ufSpliceModel = GenHPlate(
    //             TopFlange,
    //             centerPoint,
    //             spliceSection.uflangeJointThickness,
    //             sp.uflangeThickness,
    //             Math.PI / 2,
    //             Math.atan(stPoint.gradientX),
    //             -Math.atan(gradient),
    //             null,
    //             true,
    //             side2D,
    //             false
    //         );
    //         result["children"].push({
    //             ...GenHPlateSideView(
    //                 TopFlange,
    //                 centerPoint,
    //                 spliceSection.uflangeJointThickness,
    //                 sp.uflangeThickness,
    //                 90,
    //                 Math.atan(stPoint.gradientX),
    //                 -Math.atan(gradient),
    //                 null,
    //                 true,
    //                 side2D,
    //                 false
    //             ),
    //             meta: { part: gridKey, key: keyName },
    //             properties: {},
    //             weld: {},
    //             textLabel: {},
    //             dimension: {},
    //         });
    //         if (i === 0) {
    //             upperFlangeOutter["b"] = Math.abs(TopFlange[0].x - TopFlange[2].x);
    //             upperFlangeOutter["h"] = Math.abs(TopFlange[0].y - TopFlange[2].y);
    //             upperFlangeOutter["t"] = spliceSection.uflangeJointThickness;
    //         }

    //         let TopFlange2 = [
    //             { x: sign * (lx + sectionInfo.input.buf), y: -spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.buf), y: spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: -spliceSection.uflangeJointLength / 2 },
    //         ];
    //         let TopFlange3 = [
    //             { x: sign * (lx - spliceSection.margin2), y: -spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx - spliceSection.margin2), y: spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.buf - sectionInfo.input.wuf), y: spliceSection.uflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.buf - sectionInfo.input.wuf), y: -spliceSection.uflangeJointLength / 2 },
    //         ];

    //         let model2 = GenHPlateSideView(
    //             TopFlange2,
    //             centerPoint,
    //             spliceSection.uflangeJointThickness,
    //             -spliceSection.uflangeJointThickness,
    //             90,
    //             Math.atan(stPoint.gradientX),
    //             -Math.atan(gradient),
    //             null,
    //             false,
    //             side2D,
    //             false
    //         );
    //         TopPlateModels.push(model2);
    //         result["children"].push({
    //             ...model2,
    //             meta: { part: gridKey, key: keyName + "2" },
    //             properties: {},
    //             weld: {},
    //             textLabel: {},
    //             dimension: {},
    //         });

    //         let topBolt2 = {
    //             P: fBolt.P,
    //             G: fBolt.G,
    //             size: fBolt.size,
    //             dia: fBolt.dia,
    //             t: fBolt.t,
    //             l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
    //             layout: GetBoltLayout(fBolt.G, fBolt.P, "x", TopFlange2),
    //             isUpper: false,
    //             isTop: true,
    //         };
    //         // result[keyName + "2"].bolt = topBolt2;
    //         // result[keyName + "bolt2"] = {
    //         BoltInfo[keyName + "bolt2"] = GetSectionLayout(fBolt.G, fBolt.P, "x", TopFlange2, spliceSection.uflangeJointThickness);
    //         topBoltPoints.push(boltPlanPoints(topBolt2, centerPoint, Math.atan(stPoint.gradientX), -Math.atan(gradient)));
    //         result["children"].push({
    //             type: "bolt",
    //             meta: { part: gridKey, key: keyName + "bolt2" },
    //             bolt: topBolt2,
    //             Thickness: spliceSection.uflangeJointThickness,
    //             zPosition: -spliceSection.uflangeJointThickness,
    //             rotationY: -Math.atan(gradient),
    //             rotationX: Math.atan(stPoint.gradientX),
    //             point: centerPoint,
    //             model: { topView: boltPlanView(topBolt2, centerPoint, Math.atan(stPoint.gradientX), -Math.atan(gradient)) },
    //             get threeFunc() {
    //                 return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
    //             },
    //         });
    //         // result[keyName + "3"] = GenHPlate(TopFlange3, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, null, false)
    //         let model3 = GenHPlateSideView(
    //             TopFlange3,
    //             centerPoint,
    //             spliceSection.uflangeJointThickness,
    //             -spliceSection.uflangeJointThickness,
    //             90,
    //             Math.atan(stPoint.gradientX),
    //             -Math.atan(gradient),
    //             null,
    //             false,
    //             null,
    //             false
    //         );
    //         TopPlateModels.push(model3);
    //         result["children"].push({
    //             ...model3,
    //             meta: { part: gridKey, key: keyName + "3" },
    //             properties: {},
    //             weld: {},
    //             textLabel: {},
    //             dimension: {},
    //         });
    //         let topBolt3 = {
    //             P: fBolt.P,
    //             G: fBolt.G,
    //             size: fBolt.size,
    //             dia: fBolt.dia,
    //             t: fBolt.t,
    //             l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
    //             layout: GetBoltLayout(fBolt.G, fBolt.P, "x", TopFlange3),
    //             isUpper: false,
    //             isTop: true,
    //         };
    //         BoltInfo[keyName + "bolt3"] = GetSectionLayout(fBolt.G, fBolt.P, "x", TopFlange3, spliceSection.uflangeJointThickness);
    //         // result[keyName + "3"].bolt = topBolt3;
    //         // result[keyName + "bolt3"] = {
    //         topBoltPoints.push(boltPlanPoints(topBolt3, centerPoint, Math.atan(stPoint.gradientX), -Math.atan(gradient)));
    //         result["children"].push({
    //             type: "bolt",
    //             meta: { part: gridKey, key: keyName + "bolt3" },
    //             bolt: topBolt3,
    //             Thickness: spliceSection.uflangeJointThickness,
    //             zPosition: -spliceSection.uflangeJointThickness,
    //             rotationY: -Math.atan(gradient),
    //             rotationX: Math.atan(stPoint.gradientX),
    //             point: centerPoint,
    //             model: { topView: boltPlanView(topBolt3, centerPoint, Math.atan(stPoint.gradientX), -Math.atan(gradient)) },
    //             get threeFunc() {
    //                 return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
    //             },
    //         });
    //     }
    // }

    /* Lower splice model */
    let lPoint = { x: 0, y: sectionInfo.web[0][0].y };
    centerPoint = PointToGlobal(lPoint, stPoint);
    let bXRad = Math.atan(stPoint.gradientX + sectionInfo.input.gradientlf);
    if (sectionInfo.lflange[2].length > 0) {
        //폐합
        let lx1 = Math.sqrt((sectionInfo.web[0][0].x - lPoint.x) ** 2 + (sectionInfo.web[0][0].y - lPoint.y) ** 2);
        let lx2 = Math.sqrt((sectionInfo.web[1][0].x - lPoint.x) ** 2 + (sectionInfo.web[1][0].y - lPoint.y) ** 2);
        let sec = 1; // (lx1 + lx2) / (iSectionPoint.web[1][1].x - iSectionPoint.web[0][1].x) //제형단면의 경우 종리브가 깊이에 비례해서 간격이 바뀔경우를 고려
        let BottomFlange = [
            { x: -lx1 - sectionInfo.input.blf, y: -spliceSection.lflangeJointLength / 2 },
            { x: -lx1 - sectionInfo.input.blf, y: spliceSection.lflangeJointLength / 2 },
            { x: lx2 + sectionInfo.input.blf, y: spliceSection.uflangeJointLength / 2 },
            { x: lx2 + sectionInfo.input.blf, y: -spliceSection.uflangeJointLength / 2 },
        ];
        let side2D = [0, 1];
        let keyName = "cBottom";

        let lfOutterModel = GenHPlate_rev(
            BottomFlange,
            centerPoint,
            spliceSection.lflangeJointThickness,
            -sp.lflangeThickness - spliceSection.lflangeJointThickness,
            0,
            bXRad,
            0
        );
        lfOutterModel.meta = { ...lfOutterModel.meta, part: gridKey, key: "Joint-lf" };
        result["children"].push(lfOutterModel);
        // result["children"].push({
        //     ...GenHPlate(
        //         BottomFlange,
        //         centerPoint,
        //         spliceSection.lflangeJointThickness,
        //         -sp.lflangeThickness - spliceSection.lflangeJointThickness,
        //         90,
        //         bXRad,
        //         0,
        //         null,
        //         false,
        //         side2D,
        //         false
        //     ),
        //     meta: { part: gridKey, key: keyName },
        //     properties: {},
        //     weld: {},
        //     textLabel: {},
        //     dimension: {},
        // });
        lowerFlangeOutter["b"] = Math.abs(BottomFlange[0].x - BottomFlange[2].x);
        lowerFlangeOutter["h"] = Math.abs(BottomFlange[0].y - BottomFlange[2].y);
        lowerFlangeOutter["t"] = spliceSection.lflangeJointThickness;

        let xList = [-lx1 - sectionInfo.input.blf, -lx1 - sp.webThickness - spliceSection.margin2, -lx1 + spliceSection.margin2];
        let lRibJoint = [
            { y: -spliceSection.lRibJointLength / 2, x: sectionInfo.input.Lrib.height },
            { y: spliceSection.lRibJointLength / 2, x: sectionInfo.input.Lrib.height },
            { y: spliceSection.lRibJointLength / 2, x: sectionInfo.input.Lrib.height - spliceSection.lRibJointHeight },
            { y: -spliceSection.lRibJointLength / 2, x: sectionInfo.input.Lrib.height - spliceSection.lRibJointHeight },
        ];
        for (let i in sectionInfo.input.Lrib.layout) {
            let lRibPoint = PointToGlobal({ x: sectionInfo.input.Lrib.layout[i], y: lPoint.y }, stPoint);
            let lRibRightModel = GenHPlate_rev(
                lRibJoint,
                lRibPoint,
                spliceSection.lRibJointThickness,
                sectionInfo.input.Lrib.thickness / 2,
                0,
                bXRad,
                -Math.PI / 2
            );
            lRibRightModel.meta = { ...lRibRightModel.meta, part: gridKey, key: "Joint-lrib" };
            result["children"].push(lRibRightModel);
            // result["children"].push({
            //     ...GenHPlate(
            //         lRibJoint,
            //         lRibPoint,
            //         spliceSection.lRibJointThickness,
            //         sectionInfo.input.Lrib.thickness / 2,
            //         90,
            //         bXRad,
            //         -Math.PI / 2,
            //         null,
            //         false
            //     ),
            //     meta: { part: gridKey, key: "lRibJoint" + (i * 2 + 1).toString() },
            //     properties: {},
            //     weld: {},
            //     textLabel: {},
            //     dimension: {},
            // });

            let lRibBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lRibJointThickness + sectionInfo.input.Lrib.thickness,
                layout: GetBoltLayout(fBolt.G, fBolt.P, "x", lRibJoint),
                isUpper: true,
            };
            result["children"].push({
                type: "bolt",
                // meta: { material: "Bolt", part: gridKey, key: "lRibJoint" + (i * 2 + 1).toString() + "bolt" },
                meta: { material: "Bolt", part: gridKey, key: "Bolt-lf" },
                bolt: lRibBolt,
                Thickness: spliceSection.lRibJointThickness,
                zPosition: sectionInfo.input.Lrib.thickness / 2,
                rotationY: -Math.PI / 2,
                rotationX: bXRad,
                point: lRibPoint,
                get threeFunc() {
                    return InitPoint =>
                        GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });

            let lRibLeftModel = GenHPlate_rev(
                lRibJoint,
                lRibPoint,
                spliceSection.lRibJointThickness,
                -spliceSection.lRibJointThickness - sectionInfo.input.Lrib.thickness / 2,
                0,
                bXRad,
                -Math.PI / 2
            );
            lRibLeftModel.meta = { ...lRibLeftModel.meta, part: gridKey, key: "Joint-lrib" };
            result["children"].push(lRibLeftModel);
            // result["children"].push({
            //     ...GenHPlate(
            //         lRibJoint,
            //         lRibPoint,
            //         spliceSection.lRibJointThickness,
            //         -spliceSection.lRibJointThickness - sectionInfo.input.Lrib.thickness / 2,
            //         90,
            //         bXRad,
            //         -Math.PI / 2,
            //         null,
            //         false
            //     ),
            //     meta: { part: gridKey, key: "lRibJoint" + (i * 2 + 2).toString() },
            //     properties: {},
            //     weld: {},
            //     textLabel: {},
            //     dimension: {},
            // });
            xList.push((sectionInfo.input.Lrib.layout[i] - sectionInfo.input.Lrib.thickness / 2) * sec - spliceSection.margin2);
            xList.push((sectionInfo.input.Lrib.layout[i] + sectionInfo.input.Lrib.thickness / 2) * sec + spliceSection.margin2);
        }
        xList.push(lx2 - spliceSection.margin2, lx2 + sp.webThickness + spliceSection.margin2, lx2 + sectionInfo.input.blf);

        for (let i = 0; i < xList.length; i += 2) {
            keyName = "cBottomI" + i;
            let BottomFlange2 = [
                { x: xList[i], y: -spliceSection.lflangeJointLength / 2 },
                { x: xList[i], y: spliceSection.lflangeJointLength / 2 },
                { x: xList[i + 1], y: spliceSection.lflangeJointLength / 2 },
                { x: xList[i + 1], y: -spliceSection.lflangeJointLength / 2 },
            ];
            side2D = i === 0 ? [0, 1] : null;

            let lfInner1Model = GenHPlate_rev(BottomFlange2, centerPoint, spliceSection.lflangeJointThickness, 0, 0, bXRad, 0);
            lfInner1Model.meta = { ...lfInner1Model.meta, part: gridKey, key: "Joint-lf-inner" };
            result["children"].push(lfInner1Model);
            // let model = GenHPlateSideView(
            //     BottomFlange2,
            //     centerPoint,
            //     spliceSection.lflangeJointThickness,
            //     0,
            //     90,
            //     bXRad,
            //     0,
            //     null,
            //     false,
            //     side2D,
            //     true
            // );
            // BottomPlateModels.push(model);
            // result["children"].push({
            //     ...model,
            //     meta: { part: gridKey, key: keyName },
            //     properties: {},
            //     weld: {},
            //     textLabel: {},
            //     dimension: {},
            // });

            let bottomBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
                layout: GetBoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2),
                isUpper: true,
                isTop: false,
            };
            result["children"].push({
                type: "bolt",
                // meta: { material: "Bolt", part: gridKey, key: keyName + "bolt" },
                meta: { material: "Bolt", part: gridKey, key: "Bolt-lf" },
                bolt: bottomBolt,
                Thickness: spliceSection.lflangeJointThickness,
                zPosition: 0,
                rotationY: 0,
                rotationX: bXRad,
                point: centerPoint,
                // model: { bottomView: boltPlanView(bottomBolt, centerPoint, bXRad, 0) },
                get threeFunc() {
                    return InitPoint =>
                        GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
                },
            });
            // BoltInfo[keyName + "bolt"] = GetSectionLayout(fBolt.G, fBolt.P, "x", BottomFlange2, spliceSection.lflangeJointThickness);
            // bottomBoltPoints.push(boltPlanPoints(bottomBolt, centerPoint, bXRad, 0));
        }
    }
    // else {
    //     // 개구
    //     for (let i = 0; i < 2; i++) {
    //         let lx = Math.sqrt((sectionInfo.web[i][0].x - lPoint.x) ** 2 + (sectionInfo.web[i][0].y - lPoint.y) ** 2);
    //         let sign = i === 0 ? -1 : 1;
    //         let BottomFlange = [
    //             { x: sign * (lx + sectionInfo.input.blf), y: -spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.blf), y: spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.blf - sectionInfo.input.wlf), y: spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.blf - sectionInfo.input.wlf), y: -spliceSection.lflangeJointLength / 2 },
    //         ];
    //         let keyName = i === 0 ? "lBottom" : "rBottom";
    //         let side2D = i === 0 ? [0, 1] : null;
    //         // result[keyName] = GenHPlate(BottomFlange, centerPoint, spliceSection.lflangeJointThickness, - sp.lflangeThickness - spliceSection.lflangeJointThickness, 90, bXRad, 0, null, false, side2D)
    //         result["children"].push({
    //             ...GenHPlateSideView(
    //                 BottomFlange,
    //                 centerPoint,
    //                 spliceSection.lflangeJointThickness,
    //                 -sp.lflangeThickness - spliceSection.lflangeJointThickness,
    //                 90,
    //                 bXRad,
    //                 0,
    //                 null,
    //                 false,
    //                 side2D
    //             ),
    //             meta: { part: gridKey, key: keyName },
    //             properties: {},
    //             weld: {},
    //             textLabel: {},
    //             dimension: {},
    //         });
    //         if (i === 0) {
    //             lowerFlangeOutter["b"] = Math.abs(BottomFlange[0].x - BottomFlange[2].x);
    //             lowerFlangeOutter["h"] = Math.abs(BottomFlange[0].y - BottomFlange[2].y);
    //             lowerFlangeOutter["t"] = spliceSection.lflangeJointThickness;
    //         }
    //         let BottomFlange2 = [
    //             { x: sign * (lx + sectionInfo.input.blf), y: -spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.blf), y: spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: -spliceSection.lflangeJointLength / 2 },
    //         ];
    //         let BottomFlange3 = [
    //             { x: sign * (lx - spliceSection.margin2), y: -spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx - spliceSection.margin2), y: spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.blf - sectionInfo.input.wlf), y: spliceSection.lflangeJointLength / 2 },
    //             { x: sign * (lx + sectionInfo.input.blf - sectionInfo.input.wlf), y: -spliceSection.lflangeJointLength / 2 },
    //         ];
    //         // result[keyName + "2"] = GenHPlate(BottomFlange2, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, side2D, true)
    //         let model2 = GenHPlateSideView(
    //             BottomFlange2,
    //             centerPoint,
    //             spliceSection.lflangeJointThickness,
    //             0,
    //             90,
    //             bXRad,
    //             0,
    //             null,
    //             false,
    //             side2D,
    //             true
    //         );
    //         BottomPlateModels.push(model2);
    //         result["children"].push({
    //             ...model2,
    //             meta: { part: gridKey, key: keyName + "2" },
    //             properties: {},
    //             weld: {},
    //             textLabel: {},
    //             dimension: {},
    //         });

    //         let bottomBolt2 = {
    //             P: fBolt.P,
    //             G: fBolt.G,
    //             size: fBolt.size,
    //             dia: fBolt.dia,
    //             t: fBolt.t,
    //             l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
    //             layout: GetBoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2),
    //             isUpper: true,
    //             isTop: false,
    //         };
    //         BoltInfo[keyName + "bolt2"] = GetSectionLayout(fBolt.G, fBolt.P, "x", BottomFlange2, spliceSection.lflangeJointThickness);
    //         // result[keyName + "2"].bolt = bottomBolt2
    //         bottomBoltPoints.push(boltPlanPoints(bottomBolt2, centerPoint, bXRad, 0));
    //         result["children"].push({
    //             type: "bolt",
    //             meta: { part: gridKey, key: keyName + "bolt2" },
    //             bolt: bottomBolt2,
    //             Thickness: spliceSection.lflangeJointThickness,
    //             zPosition: 0,
    //             rotationY: 0,
    //             rotationX: bXRad,
    //             point: centerPoint,
    //             model: { bottomView: boltPlanView(bottomBolt2, centerPoint, bXRad, 0) },
    //             get threeFunc() {
    //                 return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
    //             },
    //         });
    //         // result[keyName + "3"] = GenHPlate(BottomFlange3, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, null, true)
    //         let model3 = GenHPlateSideView(BottomFlange3, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, null, true);
    //         BottomPlateModels.push(model3);
    //         result["children"].push({
    //             ...model3,
    //             meta: { part: gridKey, key: keyName + "3" },
    //             properties: {},
    //             weld: {},
    //             textLabel: {},
    //             dimension: {},
    //         });
    //         let bottomBolt3 = {
    //             P: fBolt.P,
    //             G: fBolt.G,
    //             size: fBolt.size,
    //             dia: fBolt.dia,
    //             t: fBolt.t,
    //             l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
    //             layout: GetBoltLayout(fBolt.G, fBolt.P, "x", BottomFlange3),
    //             isUpper: true,
    //             isTop: false,
    //         };
    //         BoltInfo[keyName + "bolt"] = GetSectionLayout(fBolt.G, fBolt.P, "x", BottomFlange3, spliceSection.lflangeJointThickness);
    //         // result[keyName + "3"].bolt = bottomBolt3
    //         bottomBoltPoints.push(boltPlanPoints(bottomBolt3, centerPoint, bXRad, 0));
    //         result["children"].push({
    //             type: "bolt",
    //             meta: { part: gridKey, key: keyName + "bolt3" },
    //             bolt: bottomBolt3,
    //             Thickness: spliceSection.lflangeJointThickness,
    //             zPosition: 0,
    //             rotationY: 0,
    //             rotationX: bXRad,
    //             point: centerPoint,
    //             model: { bottomView: boltPlanView(bottomBolt3, centerPoint, bXRad, 0) },
    //             get threeFunc() {
    //                 return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
    //             },
    //         });
    //     }
    // }
    // for (let boltKey in BoltInfo) {
    //     if (boltKey.includes("Top")) {
    //         upperFlangeOutter["nb"] += BoltInfo[boltKey].nb;
    //         upperFlangeOutter["nh"] = BoltInfo[boltKey].nh;
    //         upperFlangeOutter["n"] += 1;
    //         upperFlangeOutter["s"] = 2 * spliceSection.margin2;
    //         upperFlangeInner.push(BoltInfo[boltKey]);
    //     } else if (boltKey.includes("Bottom")) {
    //         lowerFlangeOutter["nb"] += BoltInfo[boltKey].nb;
    //         lowerFlangeOutter["nh"] = BoltInfo[boltKey].nh;
    //         lowerFlangeOutter["n"] += 1;
    //         lowerFlangeOutter["s"] = 2 * spliceSection.margin2;
    //         lowerFlangeInner.push(BoltInfo[boltKey]);
    //     } else {
    //         //only web
    //         web = BoltInfo[boltKey];
    //     }
    // }
    // let dummyTopPts = [];
    // let dummyTopPtsR = [];
    // let dummyBottomPts = [];
    // let dummyBottomPtsR = [];
    // let topLeftDimPoints = []; //모델이 대칭이라 마지막 좌표가 안측에 놓이게 됨, 하부도 마찬가지
    // for (let i in TopPlateModels) {
    //     // topLeftDimPoints.push(ToGlobalPoint2(iPoint, TopPlateModels[i]["points"][0]))
    //     // topLeftDimPoints.push(ToGlobalPoint2(iPoint, TopPlateModels[i]["points"][3]))
    //     dummyTopPts.push(TopPlateModels[i]["points"][0], TopPlateModels[i]["points"][3]);
    //     dummyTopPtsR.push(TopPlateModels[i]["points"][1], TopPlateModels[i]["points"][2]);
    // }
    // dummyTopPts.sort(function (a, b) {
    //     return a.x < b.x ? -1 : 1;
    // });
    // dummyTopPtsR.sort(function (a, b) {
    //     return a.x < b.x ? -1 : 1;
    // });
    // dummyTopPts.forEach(pt => topLeftDimPoints.push(ToGlobalPoint2(stPoint, pt)));

    // let topRightDimPoints = [
    //     //모델상에 마지막 좌표를 찾아야함
    //     ToGlobalPoint2(stPoint, dummyTopPtsR[0]),
    //     ToGlobalPoint2(stPoint, dummyTopPtsR[dummyTopPtsR.length - 1]),
    // ];
    // topBoltPoints.forEach(el => topRightDimPoints.push(...el));
    // let bottomLeftDimPoints = [];
    // for (let i in BottomPlateModels) {
    //     dummyBottomPts.push(BottomPlateModels[i]["points"][0], BottomPlateModels[i]["points"][3]);
    //     dummyBottomPtsR.push(BottomPlateModels[i]["points"][1], BottomPlateModels[i]["points"][2]);
    //     // bottomLeftDimPoints.push(BottomPlateModels[i]["model"]["bottomView"][0])
    //     // bottomLeftDimPoints.push(BottomPlateModels[i]["model"]["bottomView"][3])
    // }
    // dummyBottomPts.sort(function (a, b) {
    //     return a.x < b.x ? -1 : 1;
    // });
    // dummyBottomPtsR.sort(function (a, b) {
    //     return a.x < b.x ? -1 : 1;
    // });
    // dummyBottomPts.forEach(pt => bottomLeftDimPoints.push(ToGlobalPoint2(stPoint, pt)));

    // let bottomRightDimPoints = [
    //     ToGlobalPoint2(stPoint, dummyBottomPtsR[0]),
    //     ToGlobalPoint2(stPoint, dummyBottomPtsR[dummyTopPtsR.length - 1]),
    //     // BottomPlateModels[0]["model"]["bottomView"][1],
    //     // BottomPlateModels[BottomPlateModels.length - 1]["model"]["bottomView"][2],
    // ];
    // bottomBoltPoints.forEach(el => bottomRightDimPoints.push(...el));
    // let sideTopDimPoints = [webSidePoints[2], webSidePoints[3], ...webSideBoltPoints];
    // let sideBottomDimPoints = [webSidePoints[0], webSidePoints[1], ...webSideBoltPoints];

    // let sideLeftDimPoints = [webSidePoints[0], webSidePoints[3], ...webSideBoltPoints];
    // let sideRightDimPoints = [webSidePoints[1], webSidePoints[2], ...webSideBoltPoints];
    // let topIndex = sideTopDimPoints[0].y > sideTopDimPoints[sideTopDimPoints.length - 1].y ? true : false;
    // let bottomIndex = sideBottomDimPoints[0].y < sideBottomDimPoints[sideBottomDimPoints.length - 1].y ? true : false;

    // result["parent"].push({
    //     part: gridKey,
    //     id:
    //         sPliceName +
    //         sectionInfo.web[0][0].x.toFixed(0) +
    //         sectionInfo.web[0][0].y.toFixed(0) +
    //         sectionInfo.web[0][1].x.toFixed(0) +
    //         sectionInfo.web[0][1].y.toFixed(0) +
    //         sectionInfo.web[1][0].x.toFixed(0) +
    //         sectionInfo.web[1][0].y.toFixed(0) +
    //         sectionInfo.web[1][1].x.toFixed(0) +
    //         sectionInfo.web[1][1].y.toFixed(0) +
    //         (sectionInfo.input.isSeparated ? "P" : "B"),
    //     point: stPoint,
    //     //계산서 변수 추가 필요
    //     sectionName: sPliceName,
    //     shape: sectionInfo.input.isSeparated ? "plate" : "box",
    //     properties: {
    //         upperFlangeOutter,
    //         upperFlangeInner,
    //         lowerFlangeOutter,
    //         lowerFlangeInner,
    //         web,
    //         bolt: { name: "F13T", D: spliceSection.webBoltDia },
    //     },
    //     dimension: {
    //         sideView: [
    //             {
    //                 type: "DIMALIGN",
    //                 points: [sideTopDimPoints[0], sideTopDimPoints[1]],
    //                 index: 0,
    //                 isHorizontal: true,
    //                 isTopOrRight: true,
    //                 offsetIndex: 2,
    //             },
    //             {
    //                 type: "DIMALIGN",
    //                 points: sideTopDimPoints,
    //                 index: topIndex ? 0 : sideTopDimPoints.length - 1,
    //                 isHorizontal: true,
    //                 isTopOrRight: true,
    //                 offsetIndex: 1,
    //             },
    //             {
    //                 type: "DIMALIGN",
    //                 points: [sideBottomDimPoints[0], sideBottomDimPoints[1]],
    //                 index: 0,
    //                 isHorizontal: true,
    //                 isTopOrRight: false,
    //                 offsetIndex: 2,
    //             },
    //             { type: "DIMALIGN", points: sideBottomDimPoints, index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 1 },
    //             {
    //                 type: "DIMALIGN",
    //                 points: [sideLeftDimPoints[0], sideLeftDimPoints[1]],
    //                 index: 0,
    //                 isHorizontal: false,
    //                 isTopOrRight: false,
    //                 offsetIndex: 4,
    //             },
    //             { type: "DIMALIGN", points: sideLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
    //             { type: "DIMALIGN", points: sideRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
    //             {
    //                 type: "DIMALIGN",
    //                 points: [sideRightDimPoints[0], sideRightDimPoints[1]],
    //                 index: 0,
    //                 isHorizontal: false,
    //                 isTopOrRight: true,
    //                 offsetIndex: 4,
    //             },
    //         ],
    //         topView: [
    //             {
    //                 type: "DIMALIGN",
    //                 points: [topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]],
    //                 index: 0,
    //                 isHorizontal: false,
    //                 isTopOrRight: false,
    //                 offsetIndex: 5,
    //             },
    //             { type: "DIMALIGN", points: topLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
    //             {
    //                 type: "DIMALIGN",
    //                 points: [topRightDimPoints[0], topRightDimPoints[1]],
    //                 index: 0,
    //                 isHorizontal: false,
    //                 isTopOrRight: true,
    //                 offsetIndex: 4,
    //             },
    //             { type: "DIMALIGN", points: topRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
    //         ],
    //         bottomView: [
    //             {
    //                 type: "DIMALIGN",
    //                 points: [bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]],
    //                 index: 0,
    //                 isHorizontal: false,
    //                 isTopOrRight: false,
    //                 offsetIndex: 5,
    //             },
    //             { type: "DIMALIGN", points: bottomLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
    //             {
    //                 type: "DIMALIGN",
    //                 points: [bottomRightDimPoints[0], bottomRightDimPoints[1]],
    //                 index: 0,
    //                 isHorizontal: false,
    //                 isTopOrRight: true,
    //                 offsetIndex: 4,
    //             },
    //             { type: "DIMALIGN", points: bottomRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
    //         ],
    //     },
    // });
    return result;
}

export function GenIBeamJointDict(webPoints, centerPoint, xs, wBolt, fBolt, meta) {
    // webPoint는 반드시 좌측하단을 시작으로 시계반대방향순이어야함
    let result = {};
    const rotationY = centerPoint.skew;
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
        layout: GetBoltLayout(wBolt.G, wBolt.P, "Y", webJoint1),
        isUpper: true,
    };

    result["webJoint1"] = GenHPlate(
        webJoint1,
        webPoint1,
        xs.webJointThickness,
        xs.webThickness / 2,
        0,
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
        0,
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
        0,
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
        0,
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
        layout: GetBoltLayout(fBolt.G, fBolt.P, "y", joint2, centerPoint.skew),
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
        layout: GetBoltLayout(fBolt.G, fBolt.P, "y", joint3, centerPoint.skew),
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
        layout: GetBoltLayout(fBolt.G, fBolt.P, "y", joint2, centerPoint.skew),
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
        layout: GetBoltLayout(fBolt.G, fBolt.P, "y", joint3, centerPoint.skew),
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
        point: uPoint1,
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
        point: uPoint1,
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
        point: uPoint2,
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
        point: uPoint2,
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
        point: lPoint1,
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
        point: lPoint1,
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
        point: lPoint2,
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
        point: lPoint2,
        model: { bottomView: GenBoltPlanDraw(lflangeBolt2, lPoint2, 0, lRad) },
        get threeFunc() {
            return InitPoint => GenBoltGeometry(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        },
    };
    /////////////////////////////////// to the function //////////////////////////////////////////
    return result;
}

function GenHPlateForSplice(points, refCenterPoint, thickness, z, skew, rotationX, rotationY, points2D, top2D, side2D, bottom2D, meta = {}) {
    const rot = skew;
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
    let result = new Extrude(resultPoints, thickness, option, materialName, meta);
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
function GetBoltLayout(x, y, axis, platePoints, skew) {
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

function GetSectionLayout(x, y, axis, platePoints, thickness) {
    let lx = Math.abs(platePoints[2].x - platePoints[0].x);
    let ly = Math.abs(platePoints[2].y - platePoints[0].y);
    let xNum, yNum, yEnd, xEnd, sb, sh;

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
    let result = {};
    if (axis === "x") {
        result = { nb: xNum, nh: yNum, tb1: xEnd, tb2: xEnd, th1: yEnd, th2: yEnd, b: lx, h: ly, t: thickness, sb: x, sh: y };
    } else {
        result = { nb: yNum, nh: xNum, tb1: yEnd, tb2: yEnd, th1: xEnd, th2: xEnd, b: ly, h: lx, t: thickness, sb: y, sh: x };
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
