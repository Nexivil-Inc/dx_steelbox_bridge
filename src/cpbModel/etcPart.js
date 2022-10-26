import { Extrude, Point, PointToSkewedGlobal, RefPoint } from "@nexivil/package-modules";
import { Bolt } from "./3D";
import { BoltLayout } from "./diaVstiffXbeam";

export function CPBEtcPart(stPointDict, girderStation, sectionPointDict, etcPartInput) {
    let hStiffModel = HorStiffDict(stPointDict, sectionPointDict, etcPartInput.hStiff, etcPartInput.isStiff??false)
    console.log(etcPartInput.hStiff, etcPartInput.isStiff, hStiffModel)
    return [ ...hStiffModel['children']]
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

    if (iSectionPoint.uflange[2].length > 0) { //폐합
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
            { y: -spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height },
            { y: spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height },
            { y: spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height - spliceSection.uRibJointHeight },
            { y: -spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height - spliceSection.uRibJointHeight },
        ];
        for (let i in iSectionPoint.input.Urib.layout) {
            let uRibPoint = new RefPoint(PointToSkewedGlobal({
                x: iSectionPoint.input.Urib.layout[i],
                y: uPoint.y + gradient * iSectionPoint.input.Urib.layout[i],
            }, iPoint), iPoint.xAxis, Math.atan(iPoint.gradientX), Math.PI / 2);
            let uRibBolt = {
                P: fBolt.P,
                G: fBolt.G,
                size: fBolt.size,
                dia: fBolt.dia,
                t: fBolt.t,
                l: 2 * spliceSection.uRibJointThickness + iSectionPoint.input.Urib.thickness,
            };
            result["children"].push(
                new Extrude(uRibJoint, spliceSection.uRibJointThickness, { refPoint: uRibPoint, dz: iSectionPoint.input.Urib.thickness / 2 }, material, 
                { part: gridkey, key: "uRibJoint" + (i * 2 + 1).toString() })
            );
            result["children"].push(
                new Extrude(uRibJoint, spliceSection.uRibJointThickness, { refPoint: uRibPoint, dz: -spliceSection.uRibJointThickness - iSectionPoint.input.Urib.thickness / 2 }, material, 
                { part: gridkey, key: "uRibJoint" + (i * 2 + 2).toString() })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", uRibJoint), uRibBolt, uRibPoint, boltMaterial, 
                { part: gridkey, key: "uRibJoint" + (i * 2 + 1).toString() + "bolt" })
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
                new Extrude(TopFlange2, spliceSection.uflangeJointThickness, { refPoint: centerPoint, dz: -sp.uflangeThickness / 2  - spliceSection.uflangeJointThickness }, material, 
                { part: gridkey, key: keyName })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", TopFlange2), topBolt, centerPoint, boltMaterial, 
                { part: gridkey, key: keyName + "bolt" })
            );
        }
    } else { // 개구
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
                new Extrude(TopFlange, spliceSection.uflangeJointThickness, { refPoint: centerPoint, dz: sp.uflangeThickness / 2 }, material, 
                { part: gridkey, key: keyName })
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
                new Extrude(TopFlange2, spliceSection.uflangeJointThickness, { refPoint: centerPoint, dz: -sp.uflangeThickness / 2  - spliceSection.uflangeJointThickness }, material, 
                { part: gridkey, key: keyName + "2" })
            );
            result["children"].push(
                new Extrude(TopFlange3, spliceSection.uflangeJointThickness, { refPoint: centerPoint, dz: -sp.uflangeThickness / 2  - spliceSection.uflangeJointThickness }, material, 
                { part: gridkey, key: keyName + "3"})
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", TopFlange2), topBolt2, centerPoint, boltMaterial, 
                { part: gridkey, key: keyName + "bolt2" })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", TopFlange3), topBolt2, centerPoint, boltMaterial, 
                { part: gridkey, key: keyName + "bolt3" })
            );
        }
    }
    let lPoint = { x: 0, y: iSectionPoint.web[0][0].y };
    let bXRad = Math.atan(iPoint.gradientX + iSectionPoint.input.gradientlf);
    centerPoint = new RefPoint(PointToSkewedGlobal(lPoint, iPoint), iPoint.xAxis, bXRad, 0, -sp.lflangeThickness / 2)

    if (iSectionPoint.lflange[2].length > 0) {//폐합
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
            new Extrude(BottomFlange, spliceSection.lflangeJointThickness, { refPoint: centerPoint, dz: -sp.lflangeThickness / 2 - spliceSection.lflangeJointThickness}, material, {
                part: gridkey,
                key: keyName,
            })
        );
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
            let lRibPoint = new RefPoint(PointToSkewedGlobal({ x: iSectionPoint.input.Lrib.layout[i], y: lPoint.y }, iPoint), iPoint.xAxis, bXRad, Math.PI / 2);
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
                new Extrude(lRibJoint, spliceSection.lRibJointThickness, { refPoint: lRibPoint, dz: iSectionPoint.input.Lrib.thickness / 2 }, material, 
                { part: gridkey, key: "lRibJoint" + (i * 2 + 1).toString() })
            );
            result["children"].push(
                new Extrude(lRibJoint, spliceSection.lRibJointThickness, { refPoint: lRibPoint, dz: -spliceSection.lRibJointThickness - iSectionPoint.input.Lrib.thickness / 2 }, material, 
                { part: gridkey, key: "lRibJoint" + (i * 2 + 2).toString() })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", lRibJoint), lRibBolt, lRibPoint, boltMaterial, 
                { part: gridkey, key: "lRibJoint" + (i * 2 + 1).toString() + "bolt" })
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
                new Extrude(BottomFlange2, spliceSection.lflangeJointThickness, { refPoint: centerPoint, dz: sp.lflangeThickness / 2 }, material, 
                { part: gridkey, key: keyName })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2), bottomBolt, centerPoint, boltMaterial, 
                { part: gridkey, key: keyName + "bolt" })
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
                new Extrude(BottomFlange, spliceSection.lflangeJointThickness, { refPoint: centerPoint, dz: - sp.lflangeThickness / 2   - spliceSection.lflangeJointThickness}, material, 
                { part: gridkey, key: keyName })
            );
            result["children"].push(
                new Extrude(BottomFlange2, spliceSection.lflangeJointThickness, { refPoint: centerPoint, dz: sp.lflangeThickness / 2 }, material, 
                { part: gridkey, key: keyName + "2" })
            );
            result["children"].push(
                new Extrude(BottomFlange3, spliceSection.lflangeJointThickness, { refPoint: centerPoint, dz: sp.lflangeThickness / 2 }, material, 
                { part: gridkey, key: keyName + "3"})
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2), bottomBolt2, centerPoint, boltMaterial, 
                { part: gridkey, key: keyName + "bolt2" })
            );
            result["children"].push(
                new Bolt(BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange3), bottomBolt2, centerPoint, boltMaterial, 
                { part: gridkey, key: keyName + "bolt3" })
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
    if (isStiff){
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

export function HstiffGenV2(point1, point2, webPoints1, webPoints2, webSide1, webSide2,hstiffLayout, pk1, pk2) {
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

    let lnode1 = isTop
        ? { x: tl1.x - lcot1 * offset1, y: tl1.y - offset1 }
        : { x: bl1.x + lcot1 * offset1, y: bl1.y + offset1 };
    let lnode2 = isTop
        ? { x: tl2.x - lcot2 * offset2, y: tl2.y - offset2 }
        : { x: bl2.x + lcot2 * offset2, y: bl2.y + offset2 };
    let lgn1 = PointToSkewedGlobal(lnode1, point1); //leftGlobalNode
    let lgn2 = PointToSkewedGlobal(lnode2, point2);
    let rnode1 = isTop
        ? { x: tr1.x - rcot1 * offset1, y: tr1.y - offset1 }
        : { x: br1.x + rcot1 * offset1, y: br1.y + offset1 };
    let rnode2 = isTop
        ? { x: tr2.x - rcot2 * offset2, y: tr2.y - offset2 }
        : { x: br2.x + rcot2 * offset2, y: br2.y + offset2 };
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
        ...(new RefPoint(new Point((lgn1.x + lgn2.x) / 2,(lgn1.y + lgn2.y) / 2,(lgn1.z + lgn2.z) / 2,), new Point(lvec[1] / lLength2D, -lvec[0] / lLength2D), lRotX, lRotY)),
        offset: point1.offset + (lnode1.x + lnode2.x) / 2,
        girderStation: (point1.girderStation + point2.girderStation) / 2,
        dz: (lgn1.dz + lgn2.dz) / 2,
        gradientX: (point1.gradientX + point2.gradientX) / 2,
    };
    let rCenterPoint = {
        ...(new RefPoint(new Point((rgn1.x + rgn2.x) / 2,(rgn1.y + rgn2.y) / 2,(rgn1.z + rgn2.z) / 2,), new Point(rvec[1] / rLength2D, -rvec[0] / rLength2D), rRotX, rRotY)),
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

    result["children"].push(new Extrude(lPlate, thickness, {refPoint : lCenterPoint}, "steelBox",
        { part: partName, key: "left" + name2, girder: point1.girderNum, seg: point1.segNum }
        ))
    result["children"].push(new Extrude(rPlate, thickness, {refPoint : rCenterPoint}, "steelBox",
        { part: partName, key: "right" + name2, girder: point1.girderNum, seg: point1.segNum }
        ))

    return result;
}
