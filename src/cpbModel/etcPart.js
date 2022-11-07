import { Extrude, Loft, PlateRestPoint, Point, PointToSkewedGlobal, RefPoint, TwoPointsLength } from "@nexivil/package-modules";
import { DivideRebarSpacing, scallop, Stud, toRefPoint } from "@nexivil/package-modules/src/temp";
import { Bolt } from "./3D";
import { BoltLayout, vPlateGenV2 } from "./diaVstiffXbeam";
import { BottomRebarModel } from "./rebar";

export function CPBEtcPart(girderLayout, stPointDict, girderStation, sectionPointDict, etcPartInput, crossKeys, mainPartModel) {
    let hStiffModel = HorStiffDict(stPointDict, sectionPointDict, etcPartInput.hStiff, etcPartInput.isStiff ?? false);
    let jackupModel = JackupStiffDictV2(stPointDict, sectionPointDict, etcPartInput.jackup);
    let studModel = StudPoint(girderStation, sectionPointDict, etcPartInput.stud, etcPartInput.bottomStud, crossKeys);
    let spport = SupportGenerator(etcPartInput.supportFixed, etcPartInput.support, stPointDict, sectionPointDict);
    let lconcRebar = BottomRebarModel(etcPartInput.lowerConc, mainPartModel, sectionPointDict, girderLayout);
    return [...hStiffModel["children"], ...jackupModel["children"], ...studModel["children"], ...spport["model"]["children"], ...lconcRebar["children"]];
}

export function SplicePlateV2(stPointDict, sectionPointDict, sPliceLayout, sPliceSectionList) {
    // VstiffShapeDict(
    //   gridPoint,
    //   sectionPointDict,
    //   vStiffLayout,
    //   vStiffSectionList,
    //   sectionDB
    // ) {
    const section = 2;
    let result = { parent: [], children: [] };
    for (let i = 0; i < sPliceLayout.length; i++) {
        for (let j = 0; j < sPliceLayout[i].length; j++) {
            let gridkey = "G" + (i + 1).toFixed(0) + "SP" + (j + 1).toFixed(0); //vStiffLayout[i][position];
            let sPliceName = sPliceLayout[i][j][section];
            let sPliceSection = sPliceSectionList[sPliceName];
            if (sPliceSection) {
                let sectionPoint = sectionPointDict[gridkey].forward;
                //   let sectionID = sectionPoint.input.wuf.toFixed(0)
                +sectionPoint.input.wlf.toFixed(0) +
                    sectionPoint.input.tlf.toFixed(0) +
                    sectionPoint.input.tuf.toFixed(0) +
                    sectionPoint.input.tw.toFixed(0);
                if (spFnV2[sPliceName]) {
                    let dia = spFnV2[sPliceName](sectionPoint, stPointDict[gridkey], sPliceSection, gridkey, sPliceName);
                    result["children"].push(...dia.children);
                    // sectionID
                    // dia.parent[0].id = sectionID + dia.parent[0].id;
                    result["parent"].push(...dia.parent);
                    // result[gridkey]["id"] = sPliceName +
                    //   sectionPoint.web[0][0].x.toFixed(0) + sectionPoint.web[0][0].y.toFixed(0) +
                    //   sectionPoint.web[0][1].x.toFixed(0) + sectionPoint.web[0][1].y.toFixed(0) +
                    //   sectionPoint.web[1][0].x.toFixed(0) + sectionPoint.web[1][0].y.toFixed(0) +
                    //   sectionPoint.web[1][1].x.toFixed(0) + sectionPoint.web[1][1].y.toFixed(0)
                    // result[gridkey]["point"] = gridPointDict[gridkey]
                }
            }
        }
    }
    return result;
}

const spFnV2 = {
    현장이음1: function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) {
        return SplicePlateGenV2(sectionPoint, gridPoint, spSection, gridKey, sPliceName);
    },
    현장이음2: function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) {
        return SplicePlateGenV2(sectionPoint, gridPoint, spSection, gridKey, sPliceName);
    },
    현장이음3: function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) {
        return SplicePlateGenV2(sectionPoint, gridPoint, spSection, gridKey, sPliceName);
    },
    현장이음4: function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) {
        return SplicePlateGenV2(sectionPoint, gridPoint, spSection, gridKey, sPliceName);
    },
};

export function SplicePlateGenV2(iSectionPoint, iPoint, spliceSection, gridkey, sPliceName) {
    // (gridPoint, sectionPoint.forward)
    // let result = { type: "splice" }
    let result = { parent: [], children: [] };
    let upperFlangeOutter = { nb: 0, n: 0 };
    let upperFlangeInner = [];
    let lowerFlangeOutter = { nb: 0, n: 0 };

    let web = { nb: 0 };
    let sp = {
        webThickness: iSectionPoint.input.tw,
        uflangeWidth: iSectionPoint.input.wuf,
        lflangeWidth: iSectionPoint.input.luf,
        uflangeThickness: iSectionPoint.input.tuf,
        lflangeThickness: iSectionPoint.input.tlf,
        webJointHeight: iSectionPoint.input.H - 100,
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
    let material = "steelBox";
    let boltMaterial = "stud";

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
    web["b"] = sp.webJointHeight;
    web["h"] = spliceSection.webJointWidth;
    web["t"] = spliceSection.webJointThickness;
    let iNode = [iSectionPoint.web[0][0], iSectionPoint.web[1][0]];
    let jNode = [iSectionPoint.web[0][1], iSectionPoint.web[1][1]];
    let lcp = { x: (iNode[0].x + jNode[0].x) / 2, y: (iNode[0].y + jNode[0].y) / 2 };
    let rcp = { x: (iNode[1].x + jNode[1].x) / 2, y: (iNode[1].y + jNode[1].y) / 2 };
    for (let i = 0; i < 2; i++) {
        let webAngle = Math.PI - Math.atan((jNode[i].y - iNode[i].y) / (jNode[i].x - iNode[i].x));
        let lwebPoint = new RefPoint(PointToSkewedGlobal(lcp, iPoint), iPoint.xAxis, 0, webAngle, -sp.webThickness / 2);
        let rwebPoint = new RefPoint(PointToSkewedGlobal(rcp, iPoint), iPoint.xAxis, 0, webAngle, sp.webThickness / 2);
        let centerPoint = i === 0 ? lwebPoint : rwebPoint;
        let partName = "webJoint";
        result["children"].push(
            new Extrude(WebPlate, spliceSection.webJointThickness, { refPoint: centerPoint, dz: sp.webThickness / 2 }, material, {
                part: gridkey,
                key: partName + String(i * 2 + 1),
            })
        );
        result["children"].push(
            new Extrude(
                WebPlate,
                spliceSection.webJointThickness,
                { refPoint: centerPoint, dz: -sp.webThickness / 2 - spliceSection.webJointThickness },
                material,
                { part: gridkey, key: partName + String(i * 2 + 2) }
            )
        );
        result["children"].push(
            new Bolt(BoltLayout(wBolt.G, wBolt.P, "x", WebPlate), WebBolt, centerPoint, boltMaterial, {
                part: gridkey,
                key: partName + String(i * 2 + 1) + "bolt",
            })
        );
    }

    let uPoint = { x: 0, y: -iSectionPoint.web[0][1].x * gradient + iSectionPoint.web[0][1].y };
    let xRot = Math.atan(iPoint.gradientX);
    let yRot = -Math.atan(gradient);
    let centerPoint = new RefPoint(PointToSkewedGlobal(uPoint, iPoint), iPoint.xAxis, xRot, yRot, sp.uflangeThickness / 2);

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
        let keyName = "cTop";
        result["children"].push(
            new Extrude(TopFlange, spliceSection.uflangeJointThickness, { refPoint: centerPoint, dz: sp.uflangeThickness / 2 }, material, {
                part: gridkey,
                key: keyName,
            })
        );
        upperFlangeOutter["b"] = Math.abs(TopFlange[0].x - TopFlange[2].x);
        upperFlangeOutter["h"] = Math.abs(TopFlange[0].y - TopFlange[2].y);
        upperFlangeOutter["t"] = spliceSection.uflangeJointThickness;

        let xList = [-lx1 - iSectionPoint.input.buf, -lx1 - sp.webThickness - spliceSection.margin2, -lx1 + spliceSection.margin2];
        let uRibJoint = [
            { x: -spliceSection.uRibJointLength / 2, y: iSectionPoint.input.Urib.height },
            { x: spliceSection.uRibJointLength / 2, y: iSectionPoint.input.Urib.height },
            { x: spliceSection.uRibJointLength / 2, y: iSectionPoint.input.Urib.height - spliceSection.uRibJointHeight },
            { x: -spliceSection.uRibJointLength / 2, y: iSectionPoint.input.Urib.height - spliceSection.uRibJointHeight },
        ];
        for (let i in iSectionPoint.input.Urib.layout) {
            let uRibPoint = new RefPoint(
                PointToSkewedGlobal(
                    {
                        x: iSectionPoint.input.Urib.layout[i],
                        y: uPoint.y + gradient * iSectionPoint.input.Urib.layout[i],
                    },
                    iPoint
                ),
                new Point(-iPoint.normalSin, iPoint.normalCos), 
                -Math.PI / 2,
                Math.atan(iPoint.gradientX), //부호 확인해봐야함
            );
            let uRibBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uRibJointThickness + iSectionPoint.input.Urib.thickness,
            };
            result["children"].push(
                new Extrude(
                    uRibJoint,
                    spliceSection.uRibJointThickness,
                    { refPoint: uRibPoint, dz: iSectionPoint.input.Urib.thickness / 2 },
                    material,
                    { part: gridkey, key: "uRibJoint" + (i * 2 + 1).toString() }
                )
            );
            result["children"].push(
                new Extrude(
                    uRibJoint,
                    spliceSection.uRibJointThickness,
                    { refPoint: uRibPoint, dz: -spliceSection.uRibJointThickness - iSectionPoint.input.Urib.thickness / 2 },
                    material,
                    { part: gridkey, key: "uRibJoint" + (i * 2 + 2).toString() }
                )
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "y", uRibJoint), uRibBolt, uRibPoint, boltMaterial, {
                    part: gridkey,
                    key: "uRibJoint" + (i * 2 + 1).toString() + "bolt",
                })
            );
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
            let topBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
            };
            result["children"].push(
                new Extrude(
                    TopFlange2,
                    spliceSection.uflangeJointThickness,
                    { refPoint: centerPoint, dz: -sp.uflangeThickness / 2 - spliceSection.uflangeJointThickness },
                    material,
                    { part: gridkey, key: keyName }
                )
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", TopFlange2), topBolt, centerPoint, boltMaterial, { part: gridkey, key: keyName + "bolt" })
            );
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
            result["children"].push(
                new Extrude(TopFlange, spliceSection.uflangeJointThickness, { refPoint: centerPoint, dz: sp.uflangeThickness / 2 }, material, {
                    part: gridkey,
                    key: keyName,
                })
            );
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
            let topBolt2 = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
            };
            result["children"].push(
                new Extrude(
                    TopFlange2,
                    spliceSection.uflangeJointThickness,
                    { refPoint: centerPoint, dz: -sp.uflangeThickness / 2 - spliceSection.uflangeJointThickness },
                    material,
                    { part: gridkey, key: keyName + "2" }
                )
            );
            result["children"].push(
                new Extrude(
                    TopFlange3,
                    spliceSection.uflangeJointThickness,
                    { refPoint: centerPoint, dz: -sp.uflangeThickness / 2 - spliceSection.uflangeJointThickness },
                    material,
                    { part: gridkey, key: keyName + "3" }
                )
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", TopFlange2), topBolt2, centerPoint, boltMaterial, {
                    part: gridkey,
                    key: keyName + "bolt2",
                })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", TopFlange3), topBolt2, centerPoint, boltMaterial, {
                    part: gridkey,
                    key: keyName + "bolt3",
                })
            );
        }
    }
    let lPoint = { x: 0, y: iSectionPoint.web[0][0].y };
    let bXRad = Math.atan(iPoint.gradientX + iSectionPoint.input.gradientlf);
    centerPoint = new RefPoint(PointToSkewedGlobal(lPoint, iPoint), iPoint.xAxis, bXRad, 0, -sp.lflangeThickness / 2);

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
        let keyName = "cBottom";
        // result[keyName] = hPlateGenV2(BottomFlange, centerPoint, spliceSection.lflangeJointThickness, - sp.lflangeThickness - spliceSection.lflangeJointThickness, 90,
        //   bXRad, 0, null, false, side2D, false)
        result["children"].push(
            new Extrude(
                BottomFlange,
                spliceSection.lflangeJointThickness,
                { refPoint: centerPoint, dz: -sp.lflangeThickness / 2 - spliceSection.lflangeJointThickness },
                material,
                {
                    part: gridkey,
                    key: keyName,
                }
            )
        );
        lowerFlangeOutter["b"] = Math.abs(BottomFlange[0].x - BottomFlange[2].x);
        lowerFlangeOutter["h"] = Math.abs(BottomFlange[0].y - BottomFlange[2].y);
        lowerFlangeOutter["t"] = spliceSection.lflangeJointThickness;
        let xList = [-lx1 - iSectionPoint.input.blf, -lx1 - sp.webThickness - spliceSection.margin2, -lx1 + spliceSection.margin2];
        let lRibJoint = [
            { x: -spliceSection.lRibJointLength / 2, y: iSectionPoint.input.Lrib.height },
            { x: spliceSection.lRibJointLength / 2, y: iSectionPoint.input.Lrib.height },
            { x: spliceSection.lRibJointLength / 2, y: iSectionPoint.input.Lrib.height - spliceSection.lRibJointHeight },
            { x: -spliceSection.lRibJointLength / 2, y: iSectionPoint.input.Lrib.height - spliceSection.lRibJointHeight },
        ];

        for (let i in iSectionPoint.input.Lrib.layout) {
            let lRibPoint = new RefPoint(
                PointToSkewedGlobal({ x: iSectionPoint.input.Lrib.layout[i], y: lPoint.y }, iPoint),
                new Point(-iPoint.normalSin, iPoint.normalCos),
                Math.PI / 2,
                -bXRad,
            );
            // result["lRibJoint" + (i * 2 + 1).toString()] = hPlateGenV2(lRibJoint, lRibPoint, spliceSection.lRibJointThickness, iSectionPoint.input.Lrib.thickness / 2, 90, bXRad, -Math.PI / 2, null, false)
            let lRibBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lRibJointThickness + iSectionPoint.input.Lrib.thickness,
            };
            result["children"].push(
                new Extrude(
                    lRibJoint,
                    spliceSection.lRibJointThickness,
                    { refPoint: lRibPoint, dz: iSectionPoint.input.Lrib.thickness / 2 },
                    material,
                    { part: gridkey, key: "lRibJoint" + (i * 2 + 1).toString() }
                )
            );
            result["children"].push(
                new Extrude(
                    lRibJoint,
                    spliceSection.lRibJointThickness,
                    { refPoint: lRibPoint, dz: -spliceSection.lRibJointThickness - iSectionPoint.input.Lrib.thickness / 2 },
                    material,
                    { part: gridkey, key: "lRibJoint" + (i * 2 + 2).toString() }
                )
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "y", lRibJoint), lRibBolt, lRibPoint, boltMaterial, {
                    part: gridkey,
                    key: "lRibJoint" + (i * 2 + 1).toString() + "bolt",
                })
            );
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
            let bottomBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
            };
            result["children"].push(
                new Extrude(BottomFlange2, spliceSection.lflangeJointThickness, { refPoint: centerPoint, dz: sp.lflangeThickness / 2 }, material, {
                    part: gridkey,
                    key: keyName,
                })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2), bottomBolt, centerPoint, boltMaterial, {
                    part: gridkey,
                    key: keyName + "bolt",
                })
            );
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
            let bottomBolt2 = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
            };
            result["children"].push(
                new Extrude(
                    BottomFlange,
                    spliceSection.lflangeJointThickness,
                    { refPoint: centerPoint, dz: -sp.lflangeThickness / 2 - spliceSection.lflangeJointThickness },
                    material,
                    { part: gridkey, key: keyName }
                )
            );
            result["children"].push(
                new Extrude(BottomFlange2, spliceSection.lflangeJointThickness, { refPoint: centerPoint, dz: sp.lflangeThickness / 2 }, material, {
                    part: gridkey,
                    key: keyName + "2",
                })
            );
            result["children"].push(
                new Extrude(BottomFlange3, spliceSection.lflangeJointThickness, { refPoint: centerPoint, dz: sp.lflangeThickness / 2 }, material, {
                    part: gridkey,
                    key: keyName + "3",
                })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2), bottomBolt2, centerPoint, boltMaterial, {
                    part: gridkey,
                    key: keyName + "bolt2",
                })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange3), bottomBolt2, centerPoint, boltMaterial, {
                    part: gridkey,
                    key: keyName + "bolt3",
                })
            );
        }
    }

    return result;
}

export function HorStiffDict(pointDict, sectionPointDict, hstiffLayout, isStiff = true) {
    let result = { parent: [], children: [] };
    const from = 0;
    const to = 1;
    // const starOffset = 2;
    // const endOffset = 3;
    // const width = 4;
    // const thickness = 5;
    // const chamfer = 6;
    // const isTop =7;
    // const offset =8;
    if (isStiff) {
        for (let i = 0; i < hstiffLayout.length; i++) {
            if (hstiffLayout[i][from] && hstiffLayout[i][to]) {
                let pk1 = hstiffLayout[i][from];
                let pk2 = hstiffLayout[i][to];
                let point1 = pointDict[pk1];
                let point2 = pointDict[pk2];
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
                // result[(i+1).toString() + pk1 + pk2] = HstiffGen(point1, point2, webPoints1, webPoints2, hstiffLayout[i], pk1, pk2);
                let dia = HstiffGenV2(point1, point2, webPoints1, webPoints2, webSide1, webSide2, hstiffLayout[i], pk1, pk2);
                result["children"].push(...dia.children);
                result["parent"].push(...dia.parent);
            }
        }
    }
    return result;
    // return result;
}

export function HstiffGenV2(point1, point2, webPoints1, webPoints2, webSide1, webSide2, hstiffLayout, pk1, pk2) {
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
    let lgn1 = PointToSkewedGlobal(lnode1, point1); //leftGlobalNode
    let lgn2 = PointToSkewedGlobal(lnode2, point2);
    let rnode1 = isTop ? { x: tr1.x - rcot1 * offset1, y: tr1.y - offset1 } : { x: br1.x + rcot1 * offset1, y: br1.y + offset1 };
    let rnode2 = isTop ? { x: tr2.x - rcot2 * offset2, y: tr2.y - offset2 } : { x: br2.x + rcot2 * offset2, y: br2.y + offset2 };
    let rgn1 = PointToSkewedGlobal(rnode1, point1); //rightGlobalNode
    let rgn2 = PointToSkewedGlobal(rnode2, point2);
    let lvec = [lgn2.x - lgn1.x, lgn2.y - lgn1.y, lgn2.z - lgn1.z];
    let lLength = Math.sqrt(lvec[0] ** 2 + lvec[1] ** 2 + lvec[2] ** 2);
    let lLength2D = Math.sqrt(lvec[0] ** 2 + lvec[1] ** 2);
    let rvec = [rgn2.x - rgn1.x, rgn2.y - rgn1.y, rgn2.z - rgn1.z];
    let rLength = Math.sqrt(rvec[0] ** 2 + rvec[1] ** 2 + rvec[2] ** 2);
    let rLength2D = Math.sqrt(rvec[0] ** 2 + rvec[1] ** 2);
    let lRotX = Math.atan(lvec[2] / lLength2D);
    let rRotX = Math.atan(rvec[2] / rLength2D);
    let lRotY = Math.atan(lcot1);
    let rRotY = Math.atan(rcot1);

    let lCenterPoint = {
        ...new RefPoint(
            new Point((lgn1.x + lgn2.x) / 2, (lgn1.y + lgn2.y) / 2, (lgn1.z + lgn2.z) / 2),
            new Point(lvec[1] / lLength2D, -lvec[0] / lLength2D),
            lRotX,
            lRotY
        ),
        offset: point1.offset + (lnode1.x + lnode2.x) / 2,
        girderStation: (point1.girderStation + point2.girderStation) / 2,
        dz: (lgn1.dz + lgn2.dz) / 2,
        gradientX: (point1.gradientX + point2.gradientX) / 2,
    };
    let rCenterPoint = {
        ...new RefPoint(
            new Point((rgn1.x + rgn2.x) / 2, (rgn1.y + rgn2.y) / 2, (rgn1.z + rgn2.z) / 2),
            new Point(rvec[1] / rLength2D, -rvec[0] / rLength2D),
            rRotX,
            rRotY
        ),
        offset: point1.offset + (rnode1.x + rnode2.x) / 2,
        girderStation: (point1.girderStation + point2.girderStation) / 2,
        dz: (rgn1.dz + rgn2.dz) / 2,
        gradientX: (point1.gradientX + point2.gradientX) / 2,
    };

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

    result["children"].push(
        new Extrude(lPlate, thickness, { refPoint: lCenterPoint }, "steelBox", {
            part: partName,
            key: "left" + name2,
            girder: point1.girderNum,
            seg: point1.segNum,
        })
    );
    result["children"].push(
        new Extrude(rPlate, thickness, { refPoint: rCenterPoint }, "steelBox", {
            part: partName,
            key: "right" + name2,
            girder: point1.girderNum,
            seg: point1.segNum,
        })
    );

    return result;
}

export function JackupStiffDictV2(
    gridPoint,
    sectionPointDict,
    jackupData // position, layoutList, length, height, thickness, chamfer
) {
    let result = { parent: [], children: [] };
    for (let i in jackupData) {
        let gridkey = jackupData[i][0];
        let webPoints = sectionPointDict[gridkey].forward.web;
        let dia = jackup0V2(webPoints, gridPoint[gridkey], jackupData[i], gridkey, i);
        result["children"].push(...dia.children);
        result["parent"].push(...dia.parent);
    }
    return result;
}

export function jackup0V2(webPoints, point, jackupData, gridkey, sectionNum) {
    //ds 입력변수
    let result = { parent: [], children: [] };
    let layout = [];
    let l1 = jackupData[1].split(",");
    l1.forEach(elem => layout.push(elem.trim() * 1));
    let length = jackupData[2] * 1 ?? 0;
    let height = jackupData[3] * 1 ?? 0;
    let thickness = jackupData[4] * 1 ?? 0;
    let chamfer = jackupData[5] * 1 ?? 0;
    //  임시 입력변수

    const bl = webPoints[0][0];
    const bl2 = webPoints[0][3];
    const tl = webPoints[0][1];
    const br = webPoints[1][0];
    const br2 = webPoints[1][3];

    const tr = webPoints[1][1];
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    // const gradient = (tr.y - tl.y) / (tr.x - tl.x)

    let upperPoints = [
        { x: bl.x + lwCot * length, y: bl.y + length },
        { x: br.x + rwCot * length, y: br.y + length },
        { x: bl2.x + lwCot * length, y: bl2.y + length },
        { x: br2.x + rwCot * length, y: br2.y + length },
    ];
    let left = PlateRestPoint(bl, upperPoints[0], 0, 0, height);
    let leftPoints = [];
    leftPoints.push(left[0]);
    leftPoints.push(left[1]);
    leftPoints.push(...scallop(left[1], left[2], left[3], chamfer, 1));
    leftPoints.push(left[3]);
    let right = PlateRestPoint(br, upperPoints[1], 0, 0, -height);
    let rightPoints = [];
    rightPoints.push(right[0]);
    rightPoints.push(right[1]);
    rightPoints.push(...scallop(right[1], right[2], right[3], chamfer, 1));
    rightPoints.push(right[3]);
    let left1 = PlateRestPoint(bl2, upperPoints[2], 0, 0, -height);
    let leftPoints2 = [];
    leftPoints2.push(left1[0]);
    leftPoints2.push(left1[1]);
    leftPoints2.push(...scallop(left1[1], left1[2], left1[3], chamfer, 1));
    leftPoints2.push(left1[3]);
    let right1 = PlateRestPoint(br2, upperPoints[3], 0, 0, height);
    let rightPoints2 = [];
    rightPoints2.push(right1[0]);
    rightPoints2.push(right1[1]);
    rightPoints2.push(...scallop(right1[1], right1[2], right1[3], chamfer, 1));
    rightPoints2.push(right1[3]);
    let partKey = gridkey + "J" + sectionNum;
    let ref = toRefPoint(point, true);
    for (let i in layout) {
        let newPoint = new RefPoint(PointToSkewedGlobal({ x: 0, y: 0, z: -layout[i] }, point), ref.xAxis, Math.PI / 2);
        // result["left1" + i] = vPlateGen(leftPoints, newPoint, thickness, [], 15, null, null, [], null, [1, 2, 4, 0], [0, 4])
        // result["right1" + i] = vPlateGen(rightPoints, newPoint, thickness, [], 15, null, null, [], null, null, [0, 4])
        let leftJackup = vPlateGenV2(leftPoints, point, [], 15, null, null);
        let rightJackup = vPlateGenV2(rightPoints, point, [], 15, null, null);
        result["children"].push(
            new Extrude(leftJackup, thickness, { refPoint: newPoint }, "steelBox", {
                part: partKey,
                key: "left1" + i,
                girder: point.girderNum,
                seg: point.segNum,
            }),
            new Extrude(rightJackup, thickness, { refPoint: newPoint }, "steelBox", {
                part: partKey,
                key: "right1" + i,
                girder: point.girderNum,
                seg: point.segNum,
            })
        );
        if (jackupData[6]) {
            let leftJackup2 = vPlateGenV2(leftPoints2, point, [], 15, null, null);
            let rightJackup2 = vPlateGenV2(rightPoints2, point, [], 15, null, null);
            result["children"].push(
                new Extrude(leftJackup2, thickness, { refPoint: newPoint }, "steelBox", {
                    part: partKey,
                    key: "left2" + i,
                    girder: point.girderNum,
                    seg: point.segNum,
                }),
                new Extrude(rightJackup2, thickness, { refPoint: newPoint }, "steelBox", {
                    part: partKey,
                    key: "right2" + i,
                    girder: point.girderNum,
                    seg: point.segNum,
                })
            );
        }
    }
    return result;
}

export function StudPoint(girderStation, sectionPointDict, topStudData, bottomStudData, crossKeys) {
    const studInfo = topStudData.studInfo;
    // {
    //     "dia": 25,
    //     "height": 150,
    //     "headDia": 38,
    //     "headDepth": 10,
    //     "distance": 100,
    //     "edgeDistance" : 100
    // }
    const topPlateStudLayout = topStudData.layout;
    let studList = [];
    let segIndex = {};
    for (let i in topPlateStudLayout) {
        let ts = {
            //...topPlateStudLayout[i] };
            start: topPlateStudLayout[i][0],
            end: topPlateStudLayout[i][1],
            startOffset: topPlateStudLayout[i][2],
            endOffset: topPlateStudLayout[i][3],
            spacing: topPlateStudLayout[i][4],
            layout: topPlateStudLayout[i][5],
        };
        // let layout = ts.layout.split(',')
        const sp = ts.start;
        let girderIndex = sp.substr(1, 1) * 1 - 1; //거더개수 9개 최대적용
        if (segIndex.hasOwnProperty(girderIndex)) {
            if (sp.includes("SP")) {
                segIndex[girderIndex] += 1;
            }
        } else {
            segIndex[girderIndex] = 1;
        }

        let gridKeys = [];
        let gridPoints = [];
        let cr = false;
        let dummyStation = Infinity;
        for (let j in girderStation[girderIndex]) {
            if (girderStation[girderIndex][j].key === ts.start) {
                cr = true;
            }
            if (dummyStation !== girderStation[girderIndex][j].station) {
                if (cr && !crossKeys.includes(girderStation[girderIndex][j].key)) {
                    gridKeys.push(girderStation[girderIndex][j].key);
                    gridPoints.push(girderStation[girderIndex][j].point);
                }
            }
            if (girderStation[girderIndex][j].key === ts.end) {
                cr = false;
            }
            //
            if (cr) {
                dummyStation = girderStation[girderIndex][j].station;
            }
        }
        let totalLength = 0;
        let segLength = 0;
        let studObj = [];
        for (let j = 0; j < gridKeys.length - 1; j++) {
            let spts = [];
            let epts = [];
            let sideStartY = sectionPointDict[gridKeys[j]].forward.uflangeSide[1];
            let sideEndY = sectionPointDict[gridKeys[j + 1]].backward.uflangeSide[1];

            for (let p = 0; p < 3; p++) {
                let startFlangePoints = sectionPointDict[gridKeys[j]].forward.uflange[p];
                let endFlangePoints = sectionPointDict[gridKeys[j + 1]].backward.uflange[p];
                if (startFlangePoints.length > 0 && endFlangePoints.length > 0) {
                    let startNode = startFlangePoints[3];
                    let endNode = endFlangePoints[3];
                    let startW = Math.abs(startFlangePoints[3].x - startFlangePoints[2].x);
                    let endW = Math.abs(endFlangePoints[3].x - endFlangePoints[2].x);
                    let sign = p === 1 ? -1 : 1;
                    // 효명 스터드배치를 위한 임시코드 ==>
                    if (p < 2) {
                        //개구형 구간의 경우
                        let dx = [
                            studInfo.edgeDistance,
                            studInfo.edgeDistance + studInfo.distance,
                            studInfo.edgeDistance + 2 * studInfo.distance,
                            (studInfo.edgeDistance + 2 * studInfo.distance) * 0.6 + (startW - studInfo.edgeDistance) * 0.4,
                            startW - studInfo.edgeDistance,
                        ];
                        let dx2 = [
                            studInfo.edgeDistance,
                            studInfo.edgeDistance + studInfo.distance,
                            studInfo.edgeDistance + 2 * studInfo.distance,
                            (studInfo.edgeDistance + 2 * studInfo.distance) * 0.6 + (endW - studInfo.edgeDistance) * 0.4,
                            endW - studInfo.edgeDistance,
                        ];
                        for (let k = 0; k < 5; k++) {
                            spts.push({ x: startNode.x + sign * dx[k], y: startNode.y + sign * dx[k] * gridPoints[j].gradientY });
                            epts.push({ x: endNode.x + sign * dx2[k], y: endNode.y + sign * dx2[k] * gridPoints[j + 1].gradientY });
                        }
                    } else {
                        //박스구간인 경우
                        let startNode2 = startFlangePoints[2];
                        let endNode2 = endFlangePoints[2];
                        let dx = [
                            studInfo.edgeDistance,
                            studInfo.edgeDistance + studInfo.distance,
                            studInfo.edgeDistance + 2 * studInfo.distance,
                            (startW / 2) * 0.4 + (studInfo.edgeDistance + 2 * studInfo.distance) * 0.6,
                            (startW / 2) * 0.8 + (studInfo.edgeDistance + 2 * studInfo.distance) * 0.2,
                        ];
                        let dx2 = [
                            studInfo.edgeDistance,
                            studInfo.edgeDistance + studInfo.distance,
                            studInfo.edgeDistance + 2 * studInfo.distance,
                            (endW / 2) * 0.4 + (studInfo.edgeDistance + 2 * studInfo.distance) * 0.6,
                            (endW / 2) * 0.8 + (studInfo.edgeDistance + 2 * studInfo.distance) * 0.2,
                        ];
                        for (let k = 0; k < 5; k++) {
                            spts.push({ x: startNode.x + dx[k], y: startNode.y + dx[k] * gridPoints[j].gradientY });
                            spts.push({ x: startNode2.x - dx[k], y: startNode2.y - dx[k] * gridPoints[j].gradientY });
                            epts.push({ x: endNode.x + dx2[k], y: endNode.y + dx2[k] * gridPoints[j + 1].gradientY });
                            epts.push({ x: endNode2.x - dx2[k], y: endNode2.y - dx2[k] * gridPoints[j + 1].gradientY });
                        }
                    }
                }
            }

            spts.sort(function (a, b) {
                return a.x < b.x ? -1 : 1;
            });
            epts.sort(function (a, b) {
                return a.x < b.x ? -1 : 1;
            });

            let globalSpts = [];
            let globalEpts = [];

            spts.forEach(function (elem) {
                globalSpts.push(PointToSkewedGlobal(elem, gridPoints[j]));
            });
            epts.forEach(function (elem) {
                globalEpts.push(PointToSkewedGlobal(elem, gridPoints[j + 1]));
            });
            let sideSpt = { x: gridPoints[j].girderStation, y: sideStartY, z: 0 };
            let sideEpt = { x: gridPoints[j + 1].girderStation, y: sideEndY, z: 0 };

            segLength = Math.max(
                Math.sqrt((globalSpts[0].x - globalEpts[0].x) ** 2 + (globalSpts[0].y - globalEpts[0].y) ** 2),
                Math.sqrt(
                    (globalSpts[globalSpts.length - 1].x - globalEpts[globalEpts.length - 1].x) ** 2 +
                        (globalSpts[globalSpts.length - 1].y - globalEpts[globalEpts.length - 1].y) ** 2
                )
            );

            totalLength += segLength;
            studObj.push({ globalSpts, globalEpts, segLength, numLength: totalLength });
        }
        let xList = DivideRebarSpacing(ts.startOffset, totalLength - ts.endOffset, ts.spacing, 1);
        let studPoints = [];
        for (let x0 of xList) {
            let x = 0;
            let globalSpts = [];
            let globalEpts = [];
            let segLength = 0;
            for (let obj of studObj) {
                if (obj.numLength - x0 >= 0) {
                    x = obj.numLength - x0;
                    globalSpts = obj.globalSpts;
                    globalEpts = obj.globalEpts;
                    segLength = obj.segLength;
                    break;
                }
            }
            for (let l = 0; l < globalSpts.length; l++) {
                // 항상 10개가 나올 것임.
                let point = {
                    x: (x / segLength) * globalSpts[l].x + ((segLength - x) / segLength) * globalEpts[l].x,
                    y: (x / segLength) * globalSpts[l].y + ((segLength - x) / segLength) * globalEpts[l].y,
                    z: (x / segLength) * globalSpts[l].z + ((segLength - x) / segLength) * globalEpts[l].z,
                };
                if (studPoints.length > 0) {
                    if (TwoPointsLength(studPoints[studPoints.length - 1], point) > studInfo.distance * 0.99) {
                        studPoints.push(point);
                    }
                } else {
                    studPoints.push(point);
                }
            }
        }
        let groupName = "G" + (girderIndex + 1).toString() + "SEG" + segIndex[girderIndex].toString();
        if (studPoints.length > 0) {
            studList.push(
                new Stud(0, 0, 0, studPoints, studInfo, {}, "stud", {
                    key: groupName,
                    part: ts.start + ts.end,
                    girder: girderIndex + 1,
                    seg: segIndex[girderIndex],
                    category: "topFlange",
                })
            );
        }
    }

    let bottomStud = BottomStudPoint(girderStation, sectionPointDict, bottomStudData);
    studList.push(...bottomStud.studList);

    let result = {
        parent: [
            {
                name: "stud",
                properties: {
                    H: studInfo.height,
                    D: studInfo.dia,
                    nB: 10,
                    nP: 3,
                    t: 100,
                    shMin: 100,
                    svB: 450,
                    svP: 450,
                },
            },
            {
                name: "stud2",
                properties: {
                    H: 100,
                    D: 22,
                    n: 12,
                    shMin: 75,
                    sv: 450,
                },
            },
        ],
        children: studList,
        // dimension: bottomStud.dimension,
        // section: bottomStud.section
    };

    return result; //{ studList, studDict: { ...studDict, ...bottomStud.studDict } }
}

export function BottomStudPoint(girderStation, sectionPointDict, bottomStudData) {
    //1차적으로는 station을 기준으로 배치하고 향후 옵션(곡선교에 대한)을 추가해서, 실간격을 반영할지 여부를 판단할 것임.
    let studList = [];
    let studDict = {};
    let section = [];
    let dimension = [];
    const studInfo = bottomStudData.studInfo;
    // {
    //     "dia": 22,
    //     "height": 100,
    //     "headDia": 38,
    //     "headDepth": 10,
    //     "endOffset": 200,
    //     "spliceOffset": 400,
    //     "spacing": 400
    // }
    const layout = bottomStudData.layout;
    // [150, 225, 300, 500, 700, 900]//[200, 500]; //웹으로부터 2개씩
    const sideLayout = bottomStudData.sideLayout;
    // [150, 300];
    const diaPhragmLayout = bottomStudData.diaPhragmLayout;
    // 150; //바닥면 기준으로 150mm 이격

    let studPoints = [];
    for (let i in girderStation) {
        let cr = false;
        let subGrid = [];
        let girder = i * 1 + 1;
        let seg = 1;
        let span = 0;
        for (let j in girderStation[i]) {
            let key = girderStation[i][j].key;
            let point = girderStation[i][j].point;
            let bool = ["D", "V", "SP"].some(el => key.includes(el));
            if (key.includes("SP")) {
                seg += 1;
            }
            if (!key.includes("SP") && key.includes("S")) {
                span += 1;
            }
            if (sectionPointDict[key].backward.input.Tcl === 0 && sectionPointDict[key].forward.input.Tcl > 0) {
                cr = true;
            }
            if (bool && cr) {
                subGrid.push({ girder, seg, span, key, point });
            }
            if (cr && bool && sectionPointDict[key].forward.input.Tcl === 0) {
                cr = false;
                studPoints.push(subGrid);
                subGrid = [];
            }
        }
    }
    for (let i in studPoints) {
        let segLength = 0;
        let partName = "G" + studPoints[i][0].girder.toString() + "lConc" + String(i * 1 + 1);

        for (let j = 0; j < studPoints[i].length - 1; j++) {
            let points = [];
            let sidePoints = [];
            let dsSidePoints = [];
            let deSidePoints = [];
            let rwSidePoints = [];
            let leftPoints = [];
            let rightPoints = [];
            let spts = [];
            let epts = [];
            let lspts = [];
            let rspts = [];
            let lepts = [];
            let repts = [];
            let dspts = []; //다이아프램 스터드
            let depts = []; //다이아프램 스터드
            let skey = studPoints[i][j].key;
            let ekey = studPoints[i][j + 1].key;
            let startPoint = studPoints[i][j].point;
            let endPoint = studPoints[i][j + 1].point;

            let startLefttan =
                (sectionPointDict[skey].forward.web[0][1].x - sectionPointDict[skey].forward.web[0][0].x) /
                (sectionPointDict[skey].forward.web[0][1].y - sectionPointDict[skey].forward.web[0][0].y);
            let startRighttan =
                (sectionPointDict[skey].forward.web[1][1].x - sectionPointDict[skey].forward.web[1][0].x) /
                (sectionPointDict[skey].forward.web[1][1].y - sectionPointDict[skey].forward.web[1][0].y);
            let endLefttan =
                (sectionPointDict[ekey].backward.web[0][1].x - sectionPointDict[ekey].backward.web[0][0].x) /
                (sectionPointDict[ekey].backward.web[0][1].y - sectionPointDict[ekey].backward.web[0][0].y);
            let endRighttan =
                (sectionPointDict[ekey].backward.web[1][1].x - sectionPointDict[ekey].backward.web[1][0].x) /
                (sectionPointDict[ekey].backward.web[1][1].y - sectionPointDict[ekey].backward.web[1][0].y);

            let lRad = Math.atan(startLefttan);
            let rRad = Math.atan(startRighttan);
            let rot =
                Math.atan2(studPoints[i][j + 1].point.y - studPoints[i][j].point.y, studPoints[i][j + 1].point.x - studPoints[i][j].point.x) -
                Math.PI / 2;
            // let rot1 = Math.atan2(studPoints[i][j].point.normalSin, studPoints[i][j].point.normalCos)
            // let rot2 = Math.atan2(studPoints[i][j + 1].point.normalSin, studPoints[i][j + 1].point.normalCos)

            let startLeftPoint = sectionPointDict[skey].forward.web[0][0];
            let startRightPoint = sectionPointDict[skey].backward.web[1][0];
            let endLeftPoint = sectionPointDict[ekey].forward.web[0][0];
            let endRightPoint = sectionPointDict[ekey].backward.web[1][0];
            let sideStartY = sectionPointDict[skey].forward.lflangeSide[0];
            let sideEndY = sectionPointDict[ekey].backward.lflangeSide[0];

            for (let l in layout) {
                spts.push({ x: startLeftPoint.x + layout[l], y: startLeftPoint.y });
                spts.push({ x: startRightPoint.x - layout[l], y: startRightPoint.y });
                epts.push({ x: endLeftPoint.x + layout[l], y: endLeftPoint.y });
                epts.push({ x: endRightPoint.x - layout[l], y: endRightPoint.y });
                if (skey.includes("D")) {
                    dspts.push({ x: startLeftPoint.x + layout[l], y: startLeftPoint.y + diaPhragmLayout });
                    dspts.push({ x: startRightPoint.x - layout[l], y: startRightPoint.y + diaPhragmLayout });
                }
                if (ekey.includes("D")) {
                    depts.push({ x: endLeftPoint.x + layout[l], y: endLeftPoint.y + diaPhragmLayout });
                    depts.push({ x: endRightPoint.x - layout[l], y: endRightPoint.y + diaPhragmLayout });
                }
            }
            dspts.sort(function (a, b) {
                return a.x > b.x ? 1 : -1;
            });
            depts.sort(function (a, b) {
                return a.x > b.x ? 1 : -1;
            });
            for (let l in sideLayout) {
                let h1 = sectionPointDict[skey].forward.input.Tcl - sideLayout[l];
                let h2 = sectionPointDict[ekey].backward.input.Tcl - sideLayout[l];
                lspts.push({ x: startLeftPoint.x + h1 * startLefttan, y: startLeftPoint.y + h1, h: h1 });
                rspts.push({ x: startRightPoint.x + h1 * startRighttan, y: startRightPoint.y + h1, h: h1 });
                lepts.push({ x: endLeftPoint.x + h2 * endLefttan, y: endLeftPoint.y + h2, h: h2 });
                repts.push({ x: endRightPoint.x + h2 * endRighttan, y: endRightPoint.y + h2, h: h2 });
            }

            let globalSpts = [];
            let globalEpts = [];
            let dGlobalSpts = [];
            let dGlobalEpts = [];

            spts.forEach(function (elem) {
                globalSpts.push(PointToSkewedGlobal(elem, studPoints[i][j].point));
            });
            epts.forEach(function (elem) {
                globalEpts.push(PointToSkewedGlobal(elem, studPoints[i][j + 1].point));
            });
            dspts.forEach(function (elem) {
                dGlobalSpts.push(PointToSkewedGlobal(elem, studPoints[i][j].point));
            });
            depts.forEach(function (elem) {
                dGlobalEpts.push(PointToSkewedGlobal(elem, studPoints[i][j + 1].point));
            });
            dsSidePoints.push({ x: studPoints[i][j].point.girderStation, y: sideStartY + diaPhragmLayout, z: 0 });
            deSidePoints.push({ x: studPoints[i][j + 1].point.girderStation, y: sideEndY + diaPhragmLayout, z: 0 });

            let leftGlobalSpts = [];
            let leftGlobalEpts = [];
            let rightGlobalSpts = [];
            let rightGlobalEpts = [];
            lspts.forEach(function (elem) {
                leftGlobalSpts.push({ ...PointToSkewedGlobal(elem, studPoints[i][j].point), h: elem.h });
            });
            lepts.forEach(function (elem) {
                leftGlobalEpts.push({ ...PointToSkewedGlobal(elem, studPoints[i][j + 1].point), h: elem.h });
            });
            rspts.forEach(function (elem) {
                rightGlobalSpts.push({ ...PointToSkewedGlobal(elem, studPoints[i][j].point), h: elem.h });
            });
            repts.forEach(function (elem) {
                rightGlobalEpts.push({ ...PointToSkewedGlobal(elem, studPoints[i][j + 1].point), h: elem.h });
            });

            let sideSpt = { x: studPoints[i][j].point.girderStation, y: sideStartY, z: 0 };
            let sideEpt = { x: studPoints[i][j + 1].point.girderStation, y: sideEndY, z: 0 };

            let startOffset = studInfo.endOffset;
            let endOffset = studInfo.endOffset;
            if (skey.includes("SP")) {
                // totalLength = 0;
                startOffset = studInfo.spliceOffset;
            }
            if (ekey.includes("SP")) {
                endOffset = studInfo.spliceOffset;
            }
            // totalLength += segLength
            segLength = endPoint.girderStation - startPoint.girderStation;
            let remainder = (segLength - startOffset - endOffset) % studInfo.spacing;
            let sNum = segLength - remainder > 0 ? Math.floor((segLength - startOffset - endOffset - remainder) / studInfo.spacing) + 2 : 0;
            let x = startOffset;
            for (let k = 0; k < sNum; k++) {
                if (k === sNum - 1) {
                    x = segLength - endOffset;
                } else if (k > 0) {
                    x = startOffset + (remainder / 2 + studInfo.spacing / 2) + (k - 1) * studInfo.spacing;
                }

                for (let l = 0; l < spts.length; l++) {
                    points.push({
                        x: ((segLength - x) / segLength) * globalSpts[l].x + (x / segLength) * globalEpts[l].x,
                        y: ((segLength - x) / segLength) * globalSpts[l].y + (x / segLength) * globalEpts[l].y,
                        z: ((segLength - x) / segLength) * globalSpts[l].z + (x / segLength) * globalEpts[l].z,
                    });
                    if (l === 0) {
                        sidePoints.push({
                            x: ((segLength - x) / segLength) * sideSpt.x + (x / segLength) * sideEpt.x,
                            y: ((segLength - x) / segLength) * sideSpt.y + (x / segLength) * sideEpt.y,
                            z: ((segLength - x) / segLength) * sideSpt.z + (x / segLength) * sideEpt.z,
                        });
                    }
                }
                for (let l = 0; l < lspts.length; l++) {
                    if (((segLength - x) / segLength) * leftGlobalSpts[l].h + (x / segLength) * leftGlobalEpts[l].h >= 100) {
                        leftPoints.push({
                            x: ((segLength - x) / segLength) * leftGlobalSpts[l].x + (x / segLength) * leftGlobalEpts[l].x,
                            y: ((segLength - x) / segLength) * leftGlobalSpts[l].y + (x / segLength) * leftGlobalEpts[l].y,
                            z: ((segLength - x) / segLength) * leftGlobalSpts[l].z + (x / segLength) * leftGlobalEpts[l].z,
                        });
                    }
                    if (((segLength - x) / segLength) * rightGlobalSpts[l].h + (x / segLength) * rightGlobalEpts[l].h >= 100) {
                        rightPoints.push({
                            x: ((segLength - x) / segLength) * rightGlobalSpts[l].x + (x / segLength) * rightGlobalEpts[l].x,
                            y: ((segLength - x) / segLength) * rightGlobalSpts[l].y + (x / segLength) * rightGlobalEpts[l].y,
                            z: ((segLength - x) / segLength) * rightGlobalSpts[l].z + (x / segLength) * rightGlobalEpts[l].z,
                        });
                        rwSidePoints.push({
                            x: ((segLength - x) / segLength) * sideSpt.x + (x / segLength) * sideEpt.x,
                            y:
                                ((segLength - x) / segLength) * (sideStartY + rightGlobalSpts[l].h) +
                                (x / segLength) * (sideEndY + rightGlobalEpts[l].h),
                            z: 0,
                        });
                    }
                }
            }
            sidePoints.sort(function (a, b) {
                return a.x > b.x ? 1 : -1;
            });

            let groupName = "G" + studPoints[i][j].girder.toString() + "SEG" + studPoints[i][j].seg.toString() + "_" + j.toString();
            // let partName = "G" + studPoints[i][j].girder.toString() + "S" + studPoints[i][j].span.toString()
            if (leftPoints.length > 0) {
                //볼트형 스터드로 옵션
                studList.push(
                    new Stud(0, Math.PI / 2 + lRad, rot, leftPoints, studInfo, { bolt: true }, "stud", {
                        key: groupName + "L",
                        part: partName,
                        girder: studPoints[i][j].girder,
                        seg: studPoints[i][j].seg,
                        massNum: i * 1,
                        category: "leftWeb",
                    })
                );
            }
            if (rightPoints.length > 0) {
                studList.push(
                    new Stud(0, -Math.PI / 2 + rRad, rot, rightPoints, studInfo, { bolt: true }, "stud", {
                        key: groupName + "R",
                        part: partName,
                        girder: studPoints[i][j].girder,
                        seg: studPoints[i][j].seg,
                        massNum: i * 1,
                        category: "rightWeb",
                    })
                );
            }
            if (!studDict[groupName]) {
                studDict[groupName] = {};
            }
            if (skey.includes("D")) {
                if (dGlobalSpts.length > 0) {
                    studList.push(
                        new Stud(-Math.PI / 2, 0, rot, dGlobalSpts, studInfo, { bolt: true }, "stud", {
                            key: groupName + "DS",
                            part: partName,
                            girder: studPoints[i][j].girder,
                            seg: studPoints[i][j].seg,
                            massNum: i * 1,
                            category: "diaphragmStart",
                        })
                    );
                }
            }
            if (ekey.includes("D")) {
                if (dGlobalEpts.length > 0) {
                    studList.push(
                        new Stud(Math.PI / 2, 0, rot, dGlobalEpts, studInfo, { bolt: true }, "stud", {
                            key: groupName + "DE",
                            part: partName,
                            girder: studPoints[i][j].girder,
                            seg: studPoints[i][j].seg,
                            massNum: i * 1,
                            category: "diaphragmEnd",
                        })
                    );
                }
            }
            if (points.length > 0) {
                studList.push(
                    new Stud(0, 0, 0, points, studInfo, { bolt: true }, "stud", {
                        key: groupName + "B",
                        part: partName,
                        girder: studPoints[i][j].girder,
                        seg: studPoints[i][j].seg,
                        massNum: i * 1,
                        category: "bottomFlange",
                    })
                );
            }
        }
    }

    return { studList, dimension, section }; //, studDict }
}

export function SupportGenerator(supportFixed, supportLayout, gridPoint, sectionPointDict) {
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
        let fixed = gridPoint[fixedPoint[0][0]];
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
        point = gridPoint[name];
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

        let pointAng = Math.atan2(point.normalCos, -point.normalSin);
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
        // if (!model[name]){
        //     model[name]={}
        // }
        // model[name]["solePlate" + index] = { type: "loft", points: newPoints } //곡선의 경우 솔플레이트 각도가 90도 회전되어 있음. 원인 파악 및 오류수정 필요 by drlim 20201024
        model["children"].push(new Loft(newPoints, true, "support", { key: "SPPT" + index, part: name }));
    }
    return { data, model };
}
