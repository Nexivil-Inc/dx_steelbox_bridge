import { THREE, BufferGeometryUtils } from "global";
import { GenFlangeQuantity, GenRibQuantity, GenWebQuantity } from "./quantity";
import {
    GetFilletPoints,
    GetCenterPoint,
    GetPointBasedLength,
    GetRefPoint,
    Hatch,
    Line,
    Loft,
    PointToGlobal,
    TwoLineIntersect,
    TwoPointsLength,
} from "@nexivil/package-modules";
import { GetWeldingPoint } from "./utils";
import { GenSteelBoxGeometry } from "./geometry";

export function GenSteelBoxModelFn(girderStationList, sectionPointDict, entrance) {
    let bottomConcDict = {};
    let result = { parent: [], children: [] };
    let pk1 = "";
    let pk2 = "";
    let UFi = 1;
    let Bi = 1;
    let Wi = 1;
    let lRibi = 1;
    let uRibi = 1;
    let lConci = 1;
    let endCutFilletR = 200;

    let keyname = "";
    let splicer = [];
    let checkList1 = [[], []];
    let checkList2 = [[], []];
    for (let i in girderStationList) {
        let segNum = 1;
        let segName = "G" + (i * 1 + 1).toFixed(0) + "SEG" + segNum.toString();
        let topPoints = [[], [], []];
        let bottomPoints = [[], [], []];
        let leftWebShapeList = [[], [], []];
        let rightWebShapeList = [[], [], []];
        let topSidePoints = [[], [], []];
        let bottomSidePoints = [[], [], []];
        let rightWebSidePoints = [[], [], []];
        let topRibPoints = [];
        let bottomRibPoints = [];
        let bottomConcPoints = [];
        let bottomConcGridPoints = [];
        let bottomConcSidePoints = [];
        let uflangeShapeList = [];
        let lflangePointList = [];
        for (let j = 0; j < girderStationList[i].length - 1; j++) {
            let L1 = []; //sectionPointDict[pk1].forward.leftTopPlate
            let L2 = []; //sectionPointDict[pk2].backward.leftTopPlate
            let L3 = []; //sectionPointDict[pk2].forward.leftTopPlate
            let L1S = []; //sectionPointDict[pk1].forward.leftTopPlate
            let L2S = []; //sectionPointDict[pk2].backward.leftTopPlate
            let L3S = []; //sectionPointDict[pk2].backward.leftTopPlate

            let point1 = girderStationList[i][j].point;
            let point2 = girderStationList[i][j + 1].point;
            let refPt1 = GetRefPoint(point1);
            let refPt2 = GetRefPoint(point2);
            pk1 = girderStationList[i][j].key;
            pk2 = girderStationList[i][j + 1].key;

            if (pk1.includes("SP")) {
                segNum += 1;
                segName = "G" + (i * 1 + 1).toFixed(0) + "SEG" + segNum.toString();
            }

            keyname = "G" + (i * 1 + 1).toString() + "TopPlate" + UFi;
            splicer = ["TF", "SP", "K6"];
            let uflangeShape = GenFlangeShape(sectionPointDict, pk1, pk2, point1, point2, "uflange", splicer, endCutFilletR);
            uflangeShapeList.push(uflangeShape);

            /* 상부플랜지 모델 생성 */
            let uflangeSide = GenFlangeSidePoints(sectionPointDict, pk1, pk2, point1, point2, "uflangeSide", splicer, endCutFilletR);
            uflangeSide.forEach((el, i) => topSidePoints[i].push(...el));
            splicer.forEach(function (sp) {
                if (pk2.substr(2, 2) === sp) {
                    let topView = GenFlangePlanDraw(uflangeShapeList);

                    // 수량+라벨계산
                    topView.forEach(draw => topPoints.push(draw.vertices));
                    let qnttData = GenFlangeQuantity(topPoints);
                    let thickness = sectionPointDict[pk1].forward.input.tuf;
                    let textLabelView = [];
                    let ea = topView.length > 1 ? "2" : "1";
                    let yOffset = topView.length > 1 ? 300 : 1300;
                    if (qnttData.length > 0 && topView[0]) {
                        textLabelView.push({
                            text: "상부 플렌지(HSB500) " + ea + "PL-" + qnttData[0].l + "x" + String(thickness) + "x" + qnttData[0].w,
                            anchor: GetCenterPoint(topView[0]["vertices"]),
                            rot: 0,
                            yOffset,
                        });
                    }
                    //
                    let uflangeMeta = {
                        part: segName,
                        key: keyname,
                        girder: i * 1 + 1,
                        seg: segNum,
                    };
                    result["children"].push({
                        type: "steelbox",
                        meta: { ...uflangeMeta, material: "Steel", name: "SteelBox" },
                        properties: {
                            thickness: sectionPointDict[pk1].forward.input.tuf,
                            qnttData,
                        },
                        points: GenFlangePoints(uflangeShapeList),
                        model: {
                            topView: topView,
                            sideView: GenGirderSideDraw(topSidePoints, 2, 0, 1, uflangeMeta),
                        },
                        textLabel: {
                            topView: textLabelView,
                        },
                        get threeFunc() {
                            return initPoint => GenSteelBoxGeometry(this.points, initPoint);
                        },
                    });
                    UFi += 1;
                    //initiallize
                    topPoints = [[], [], []];
                    topSidePoints = [[], [], []];
                    uflangeShapeList = [];
                    return;
                }
            });

            /* 하부플랜지 모델 생성 */
            keyname = "G" + (i * 1 + 1).toString() + "BottomPlate" + Bi;
            splicer = ["BF", "SP", "K6"];
            let lflangePoint = GenFlangeShape(sectionPointDict, pk1, pk2, point1, point2, "lflange", splicer, endCutFilletR);
            let lflangeSide = GenFlangeSidePoints(sectionPointDict, pk1, pk2, point1, point2, "lflangeSide", splicer, endCutFilletR);
            lflangePointList.push(lflangePoint);

            lflangeSide.forEach((el, i) => bottomSidePoints[i].push(...el));
            splicer.forEach(function (sp) {
                if (pk2.substr(2, 2) === sp) {
                    let bottomView = GenFlangePlanDraw(lflangePointList);
                    // 수량+라벨계산
                    bottomView.forEach(draw => bottomPoints.push(draw.vertices));
                    let qnttData = GenFlangeQuantity(bottomPoints);
                    let thickness = sectionPointDict[pk1].forward.input.tlf;
                    let textLabelView = [];
                    let ea = bottomView.length > 1 ? "2" : "1";
                    let yOffset = bottomView.length > 1 ? -300 : -1300;
                    if (qnttData.length > 0 && bottomView[0]) {
                        textLabelView.push({
                            text: "하부 플렌지(HSB500) " + ea + "PL-" + qnttData[0].l + "x" + String(thickness) + "x" + qnttData[0].w,
                            anchor: GetCenterPoint(bottomView[0]["vertices"]),
                            rot: 0,
                            yOffset,
                        });
                    }
                    let lflangeMeta = { part: segName, key: keyname, girder: i * 1 + 1, seg: segNum };
                    result["children"].push({
                        type: "steelbox",
                        meta: { ...lflangeMeta, material: "Steel", name: "SteelBox" },
                        properties: {
                            thickness: sectionPointDict[pk1].forward.input.tlf,
                            qnttData,
                        },
                        points: GenFlangePoints(lflangePointList),
                        model: {
                            bottomView: bottomView,
                            sideView: GenGirderSideDraw(bottomSidePoints, 2, 0, 1, lflangeMeta),
                        },
                        textLabel: {
                            bottomView: textLabelView,
                        },

                        get threeFunc() {
                            return initPoint => GenSteelBoxGeometry(this.points, initPoint);
                        },
                    });
                    Bi += 1;
                    bottomPoints = [[], [], []];
                    bottomSidePoints = [[], [], []];
                    lflangePointList = [];
                    return;
                }
            });

            /* XXX 모델 생성 */
            splicer = ["WF", "SP", "K6"];
            let webSide = GenWebSidePoints(sectionPointDict, pk1, pk2, point1, point2, "webSide", splicer, endCutFilletR, entrance);
            let leftWebShape = GenWebShape(sectionPointDict, pk1, pk2, point1, point2, 0, splicer, endCutFilletR, entrance);
            let rightWebShape = GenWebShape(sectionPointDict, pk1, pk2, point1, point2, 1, splicer, endCutFilletR, entrance);
            leftWebShape.forEach((el, i) => leftWebShapeList[i].push(...el));
            rightWebShape.forEach((el, i) => rightWebShapeList[i].push(...el));

            webSide.forEach((el, i) => rightWebSidePoints[i].push(...el));
            let leftWeldingLine = GenWebWeldingLineDict(leftWebShapeList);
            let rightWeldingLine = GenWebWeldingLineDict(rightWebShapeList);
            splicer.forEach(function (sp) {
                if (pk2.substr(2, 2) === sp) {
                    let leftWebMeta = {
                        part: segName,
                        key: "G" + (i * 1 + 1).toString() + "LeftWeB" + Wi,
                        girder: i * 1 + 1,
                        seg: segNum,
                    };
                    let rightWebMeta = {
                        part: segName,
                        key: "G" + (i * 1 + 1).toString() + "RightWeB" + Wi,
                        girder: i * 1 + 1,
                        seg: segNum,
                    };
                    let rightWebSide = GenGirderSideDraw(rightWebSidePoints, 2, 0, 1);

                    let leftWebQtt = GenWebQuantity(leftWebShapeList, 4, 0, 1);
                    let rightWebQtt = GenWebQuantity(rightWebShapeList, 4, 0, 1);
                    let thickness = sectionPointDict[pk1].forward.input.tw;
                    let textLabelView = [];
                    let ea = 2; //topView.length > 1 ? "2" : "1"
                    let yOffset = 0; //topView.length > 1 ? -300 : -1300
                    if (rightWebQtt.length > 0) {
                        // 면적이 0이 되는 부재가 있어 오류 발생 추정
                        textLabelView.push({
                            text: "복부판(HSB500) " + ea + "PL-" + rightWebQtt[0].l + "x" + String(thickness) + "x" + rightWebQtt[0].w,
                            anchor: GetCenterPoint(rightWebSide[0]["vertices"]),
                            rot: 0,
                            yOffset,
                        });
                    }

                    result["children"].push({
                        type: "steelbox",
                        meta: { ...leftWebMeta, material: "Steel", name: "SteelBox" },
                        properties: {
                            thickness: sectionPointDict[pk1].forward.input.tw,
                            qnttData: leftWebQtt,
                        },
                        points: leftWebShapeList,
                        model: {
                            topView: GenWebPlanDraw(leftWebShapeList, 4, 1, 2, leftWebMeta),
                            bottomView: GenWebPlanDraw(leftWebShapeList, 4, 0, 3, leftWebMeta),
                        },
                        weld: [
                            {
                                type: "FF",
                                thickness1: sectionPointDict[pk1].forward.input.tw,
                                thickness2: sectionPointDict[pk1].forward.input.tuf,
                                line: [leftWeldingLine.top],
                                topView: {
                                    point: GetWeldingPoint(leftWeldingLine.top, 0.5),
                                    isUpper: false,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                },
                            },
                            {
                                type: "FF",
                                thickness1: sectionPointDict[pk1].forward.input.tw,
                                thickness2: sectionPointDict[pk1].forward.input.tlf,
                                line: [leftWeldingLine.bottom],
                                bottomView: {
                                    point: GetWeldingPoint(leftWeldingLine.bottom, 0.5),
                                    isUpper: false,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                },
                            },
                        ],
                        get threeFunc() {
                            return initPoint => GenSteelBoxGeometry(this.points, initPoint);
                        },
                    });

                    result["children"].push({
                        type: "steelbox",
                        meta: { ...rightWebMeta, material: "Steel", name: "SteelBox" },
                        properties: {
                            thickness: sectionPointDict[pk1].forward.input.tw,
                            qnttData: leftWebQtt,
                        },
                        points: rightWebShapeList,
                        model: {
                            topView: GenWebPlanDraw(rightWebShapeList, 4, 1, 2, rightWebMeta),
                            bottomView: GenWebPlanDraw(rightWebShapeList, 4, 0, 3, rightWebMeta),
                            sideView: rightWebSide,
                        },
                        weld: [
                            {
                                type: "FF",
                                thickness1: sectionPointDict[pk1].forward.input.tw,
                                thickness2: sectionPointDict[pk1].forward.input.tuf,
                                line: [rightWeldingLine.top],
                                topView: {
                                    point: GetWeldingPoint(rightWeldingLine.top, 0.5),
                                    isUpper: true,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                },
                            },
                            {
                                type: "FF",
                                thickness1: sectionPointDict[pk1].forward.input.tw,
                                thickness2: sectionPointDict[pk1].forward.input.tlf,
                                line: [rightWeldingLine.bottom],
                                bottomView: {
                                    point: GetWeldingPoint(rightWeldingLine.bottom, 0.5),
                                    isUpper: true,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                },
                            },
                        ],
                        textLabel: {
                            sideView: textLabelView,
                        },
                        get threeFunc() {
                            return initPoint => GenSteelBoxGeometry(this.points, initPoint);
                        },
                    });
                    Wi += 1;
                    leftWebShapeList = [[], [], []];
                    rightWebShapeList = [[], [], []];
                    rightWebSidePoints = [[], [], []];
                    return;
                }
            });

            if (point1.girderStation < point2.girderStation) {
                keyname = "G" + (i * 1 + 1).toString() + "lRib" + lRibi;
                L1 = sectionPointDict[pk1].forward.LRib;
                L2 = sectionPointDict[pk2].backward.LRib;
                L3 = sectionPointDict[pk2].forward.LRib;
                if (bottomRibPoints.length < L1.length) {
                    //고유의 키값을 구분하는 방법은?
                    L1.forEach(elem => bottomRibPoints.push([]));
                }
                if (L1.length > 0) {
                    for (let k in L1) {
                        L1[k].forEach(element => bottomRibPoints[k].push(PointToGlobal(element, refPt1)));
                    }
                    if ((L2.length > 0 && L3.length !== L2.length) || pk2.substr(2, 2) === "SP" || pk2.substr(2, 2) === "K6") {
                        for (let k in L2) {
                            L2[k].forEach(element => bottomRibPoints[k].push(PointToGlobal(element, refPt2)));
                        }

                        let ribWeldingLine = GenRibWeldingLineDict(bottomRibPoints);
                        let lRibWeld = [];
                        for (let w in ribWeldingLine) {
                            lRibWeld.push({
                                type: "FF",
                                thickness1: sectionPointDict[pk1].forward.input.Lrib.thickness,
                                thickness2: sectionPointDict[pk1].forward.input.tuf,
                                line: [ribWeldingLine[w]],
                                bottomView: {
                                    point: GetWeldingPoint(ribWeldingLine[w], 0.3),
                                    isUpper: true,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                },
                            });
                        }

                        let bottomRibMeta = {
                            part: segName,
                            key: "G" + (i * 1 + 1).toString() + "lRib" + lRibi,
                            girder: i * 1 + 1,
                            seg: segNum,
                        };
                        let bottomRibPlan = GenRibPlanDraw(bottomRibPoints, 4, 0, 3, bottomRibMeta);
                        let bottomRibQtt = GenRibQuantity(bottomRibPoints, 4, 0, 1);
                        let thickness = sectionPointDict[pk1].forward.input.Lrib.thickness;
                        let textLabelView = [];
                        let ea = bottomRibPlan.length;
                        let yOffset = 100; //topView.length > 1 ? -300 : -1300
                        textLabelView.push({
                            text: "L-RIB " + ea + "PL-" + bottomRibQtt[0].l + "x" + String(thickness) + "x" + bottomRibQtt[0].w,
                            anchor: GetCenterPoint(bottomRibPlan[bottomRibPlan.length - 1]["vertices"]),
                            rot: 0,
                            yOffset,
                        });

                        result["children"].push({
                            type: "steelbox",
                            meta: { ...bottomRibMeta, material: "Steel", name: "SteelBox" },
                            properties: {
                                thickness: sectionPointDict[pk1].forward.input.Lrib.thickness,
                                qnttData: bottomRibQtt,
                            },
                            points: bottomRibPoints,
                            model: {
                                bottomView: bottomRibPlan,
                            },
                            weld: lRibWeld,
                            textLabel: {
                                bottomView: textLabelView,
                            },
                            get threeFunc() {
                                return initPoint => GenSteelBoxGeometry(this.points, initPoint);
                            },
                        });
                        lRibi += 1;
                        bottomRibPoints = [];
                    }
                }

                keyname = "G" + (i * 1 + 1).toString() + "uRib" + uRibi;
                // if (!steelBoxDict[keyname]) { steelBoxDict[keyname] = { points: [[], [], []] }; };
                L1 = sectionPointDict[pk1].forward.URib;
                L2 = sectionPointDict[pk2].backward.URib;
                L3 = sectionPointDict[pk2].forward.URib;
                if (topRibPoints.length < L1.length) {
                    L1.forEach(elem => topRibPoints.push([]));
                }
                if (L1.length > 0) {
                    for (let k in L1) {
                        L1[k].forEach(element => topRibPoints[k].push(PointToGlobal(element, refPt1)));
                    }
                    if ((L2.length > 0 && L3.length !== L2.length) || pk2.substr(2, 2) === "SP" || pk2.substr(2, 2) === "K6") {
                        for (let k in L2) {
                            L2[k].forEach(element => topRibPoints[k].push(PointToGlobal(element, refPt2)));
                        }

                        let ribWeldingLine = GenRibWeldingLineDict(topRibPoints);
                        let uRibWeld = [];
                        for (let w in ribWeldingLine) {
                            uRibWeld.push({
                                type: "FF",
                                thickness1: sectionPointDict[pk1].forward.input.Lrib.thickness,
                                thickness2: sectionPointDict[pk1].forward.input.tuf,
                                line: [ribWeldingLine[w]],
                                topView: {
                                    point: GetWeldingPoint(ribWeldingLine[w], 0.3),
                                    isUpper: true,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                },
                            });
                        }

                        let topRibMeta = {
                            part: segName,
                            key: keyname,
                            girder: i * 1 + 1,
                            seg: segNum,
                        };
                        let topRibPlan = GenRibPlanDraw(topRibPoints, 4, 0, 3, topRibMeta);
                        let topRibQtt = GenRibQuantity(topRibPoints, 4, 0, 1);
                        let thickness = sectionPointDict[pk1].forward.input.Urib.thickness;
                        let textLabelView = [];
                        let ea = topRibPlan.length;
                        let yOffset = 100; //topRibPlan.length > 1 ? -300 : -1300
                        textLabelView.push({
                            text: "U-RIB " + ea + "PL-" + topRibQtt[0].l + "x" + String(thickness) + "x" + topRibQtt[0].w,
                            anchor: GetCenterPoint(topRibPlan[0]["vertices"]),
                            rot: 0,
                            yOffset,
                        });

                        result["children"].push({
                            type: "steelbox",
                            meta: { ...topRibMeta, material: "Steel", name: "SteelBox" },
                            properties: {
                                thickness: sectionPointDict[pk1].forward.input.Urib.thickness,
                                qnttData: topRibQtt,
                            },
                            points: topRibPoints,
                            model: {
                                topView: topRibPlan,
                            },
                            textLabel: {
                                topView: textLabelView,
                            },
                            weld: uRibWeld,
                            get threeFunc() {
                                return initPoint => GenSteelBoxGeometry(this.points, initPoint);
                            },
                        });
                        uRibi += 1;
                        topRibPoints = [];
                    }
                }
            }

            // }
            //하부콘크리트 모델

            keyname = "G" + (i * 1 + 1).toString() + "lConc" + lConci;
            // if (!steelBoxDict[keyname]) { steelBoxDict[keyname] = { points: [[], [], []] }; };
            L1 = sectionPointDict[pk1].forward.lConc;
            L2 = sectionPointDict[pk2].backward.lConc;
            L3 = sectionPointDict[pk2].forward.lConc;
            L1S = sectionPointDict[pk1].forward.lConcSide;
            L2S = sectionPointDict[pk2].backward.lConcSide;
            L3S = sectionPointDict[pk2].forward.lConcSide;

            if (!bottomConcDict[keyname] && L1.length > 0) {
                bottomConcDict[keyname] = [];
            }
            if (L1.length > 0) {
                let L1Global = [];
                L1.forEach(element => L1Global.push(PointToGlobal(element, refPt1)));
                bottomConcPoints.push(L1Global);
                bottomConcGridPoints.push({ key: pk1, point: point1 });
                let L1GlobalSide = [];
                L1S.forEach(element =>
                    L1GlobalSide.push(
                        { x: point1.girderStation, y: element, z: 0 } // 종단선형을 따를 경우 y좌표에 point1.z좌표를 더함
                    )
                );
                bottomConcSidePoints.push(L1GlobalSide);
            }
            if (L1.length > 0 && L2.length > 0 && L3.length === 0) {
                let L2Global = [];
                L2.forEach(element => L2Global.push(PointToGlobal(element, refPt2)));
                bottomConcPoints.push(L2Global);
                bottomConcGridPoints.push({ key: pk2, point: point2 });
                let L2GlobalSide = [];
                L2S.forEach(element =>
                    L2GlobalSide.push(
                        { x: point2.girderStation, y: element, z: 0 } // 종단선형을 따를 경우 y좌표에 point1.z좌표를 더함
                    )
                );
                bottomConcSidePoints.push(L2GlobalSide);

                let bottomConcMeta = {
                    part: segName,
                    key: keyname,
                    girder: i * 1 + 1,
                    seg: segNum,
                };
                let bottomConc = new Loft(bottomConcPoints, true, "Concrete", { ...bottomConcMeta, name: "SteelBox" });
                bottomConc.gridPoints = bottomConcGridPoints;
                bottomConc.model = {
                    bottomView: GenConcPlanDraw(bottomConcPoints, 0, 3, "GRAY2", bottomConcMeta),
                    sideView: GenConcPlanDraw(bottomConcSidePoints, 0, 1, "GRAY2", bottomConcMeta),
                };
                result["children"].push(bottomConc);

                lConci += 1;
                bottomConcPoints = [];
                bottomConcGridPoints = [];
                bottomConcSidePoints = [];
            }
        }
    }
    //slabSide
    let blockOutH = 150; //추후 외부입력
    let blockOutL = 300; //추후 외부입력
    let pavement = 80; //추후 외부입력
    for (let i in girderStationList) {
        let slabPoint1 = [];
        let slabPoint2 = [];
        let startBlockOut = [];
        let endBlockOut = [];
        let pavementLine = [];
        for (let j in girderStationList[i]) {
            let pk = girderStationList[i][j].key;
            if (pk.includes("K") || pk.includes("SP")) {
                let point = girderStationList[i][j].point;
                let fb = "forward";
                if (pk.includes("K6")) {
                    fb = "backward";
                }
                let y = sectionPointDict[pk][fb]["uflangeSide"][0];
                let x = point.girderStation;
                if (pk.includes("K1")) {
                    x -= 50;
                    startBlockOut = [
                        { x: x, y: 0 },
                        { x: x, y: -blockOutH },
                        { x: x + blockOutL, y: -blockOutH },
                        { x: x + blockOutL, y: 0 },
                    ];
                    pavementLine.push({ x: x + blockOutL, y: -pavement });
                } else if (pk.includes("K6")) {
                    x += 50;
                    endBlockOut = [
                        { x: x, y: 0 },
                        { x: x, y: -blockOutH },
                        { x: x - blockOutL, y: -blockOutH },
                        { x: x - blockOutL, y: 0 },
                    ];
                    pavementLine.push({ x: x - blockOutL, y: -pavement });
                } else {
                    pavementLine.push({ x: x, y: -pavement });
                }
                slabPoint1.push({ x: x, y: 0 });
                slabPoint2.push({ x: x, y: y });
            }
        }
        let deckSideMeta = {
            part: "G" + (i * 1 + 1).toString() + "Slab",
            key: "G" + (i * 1 + 1).toString() + "Slab1",
            girder: i * 1 + 1,
            seg: 0,
        };
        result["children"].push({
            meta: deckSideMeta,
            model: {
                sideView: [
                    new Line([...slabPoint1, ...slabPoint2.reverse()], "WHITE", true, undefined, deckSideMeta),
                    new Line(startBlockOut, "WHITE", true, undefined, deckSideMeta),
                    new Line(endBlockOut, "WHITE", true, undefined, deckSideMeta),
                    new Line(pavementLine, "WHITE", true, undefined, deckSideMeta),
                ],
            },
        });
    }

    // let weldingDict = {};
    for (let i in girderStationList) {
        for (let j in girderStationList[i]) {
            if (
                girderStationList[i][j].key.includes("TF") ||
                girderStationList[i][j].key.includes("BF") ||
                girderStationList[i][j].key.includes("WF")
            ) {
                let bsection = sectionPointDict[girderStationList[i][j].key].backward;
                let fsection = sectionPointDict[girderStationList[i][j].key].forward;
                let lineList = [];
                let weld = [];
                let point = { ...girderStationList[i][j].point, z: 0 }; //종단선형을 따르는 경우에는 z:0삭제
                let plate, t1, t2;
                let bool = true;

                if (girderStationList[i][j].key.includes("TF")) {
                    plate = bsection.uflange;
                    t1 = bsection.input.tuf;
                    t2 = fsection.input.tuf;
                    for (let k in plate) {
                        if (plate[k].length > 0) {
                            let [plateRefPt1, plateRefPt2] = [GetRefPoint(plate[k][0]), GetRefPoint(plate[k][1])];
                            let line = [PointToGlobal(point, plateRefPt1), PointToGlobal(point, plateRefPt2)];
                            let weldEach = {
                                type: "B",
                                thickness1: t1,
                                thickness2: t2,
                                line: [line],
                            };
                            weldEach["topView"] = {
                                point: GetWeldingPoint(line, 0.3),
                                isUpper: true,
                                isRight: true,
                                isXReverse: false,
                                isYReverse: false,
                            };
                            if (bool) {
                                weldEach["sideView"] = {
                                    point: { x: point.girderStation, y: (plate[k][0].y + plate[k][3].y) / 2 },
                                    isUpper: true,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                };
                                bool = false;
                            }
                            weld.push(weldEach);
                        }
                    }
                } else if (girderStationList[i][j].key.includes("BF")) {
                    plate = bsection.lflange;
                    t1 = bsection.input.tlf;
                    t2 = fsection.input.tlf;
                    for (let k in plate) {
                        if (plate[k].length > 0) {
                            let [plateRefPt1, plateRefPt2] = [GetRefPoint(plate[k][0]), GetRefPoint(plate[k][1])];
                            let line = [PointToGlobal(point, plateRefPt1), PointToGlobal(point, plateRefPt2)];
                            let weldEach = {
                                type: "B",
                                thickness1: t1,
                                thickness2: t2,
                                line: [line],
                            };
                            weldEach["bottomView"] = {
                                point: GetWeldingPoint(line, 0.8),
                                isUpper: true,
                                isRight: true,
                                isXReverse: false,
                                isYReverse: false,
                            };
                            if (bool) {
                                weldEach["sideView"] = {
                                    point: { x: point.girderStation, y: (plate[k][0].y + plate[k][3].y) / 2 },
                                    isUpper: true,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                };
                                bool = false;
                            }
                            weld.push(weldEach);
                        }
                    }
                } else if (girderStationList[i][j].key.includes("WF")) {
                    plate = bsection.web;
                    t1 = bsection.input.tw;
                    t2 = fsection.input.tw;
                    for (let k in plate) {
                        if (plate[k].length > 0) {
                            let [plateRefPt1, plateRefPt2] = [GetRefPoint(plate[k][0]), GetRefPoint(plate[k][1])];
                            let line = [PointToGlobal(point, plateRefPt1), PointToGlobal(point, plateRefPt2)];
                            let weldEach = {
                                type: "B",
                                thickness1: t1,
                                thickness2: t2,
                                line: [line],
                            };
                            if (bool) {
                                weldEach["sideView"] = {
                                    point: { x: point.girderStation, y: (plate[k][0].y + plate[k][1].y) / 2 },
                                    isUpper: true,
                                    isRight: true,
                                    isXReverse: false,
                                    isYReverse: false,
                                };
                                bool = false;
                            }
                            weld.push(weldEach);
                        }
                    }
                }
                result["parent"].push({
                    part: girderStationList[i][j].key,
                    weld: weld,
                });
            }
        }
    }
    return result;
}

function GenFlangeShape(sectionPointDict, pk1, pk2, point1, point2, plateKey, splicer, endCutFilletR) {
    // 박스형 거더의 상하부플레이트 개구와 폐합에 대한 필렛을 위해 개발되었으며, 개구->폐합, 폐합->개구에 대해서만 가능하다,
    // 개구->폐합->개구로 2단계의 경우에는 오류가 발생할 수 있음, 2020.05.25 by drlim
    let result = [[], [], []];

    let filletR = 300; // 외부변수로 나와야함

    let uf0 = sectionPointDict[pk1].backward[plateKey];
    let uf1 = sectionPointDict[pk1].forward[plateKey];
    let uf2 = sectionPointDict[pk2].backward[plateKey];
    let uf3 = sectionPointDict[pk2].forward[plateKey];
    let FisB = IsSameFlange(uf2, uf3); //forward is backward?
    let FisB0 = IsSameFlange(uf0, uf1); //forward is backward?
    let plate0 = [[], [], []];
    let plate1 = [[], [], []];
    let plate2 = [[], [], []];
    let plate3 = [[], [], []];
    let smoothness = 8;
    let former1 = uf0[0][0] ? uf0[0][0].x : uf0[2][0].x; //point1.backward
    let latter1 = uf1[0][0] ? uf1[0][0].x : uf1[2][0].x; //point1.forward
    let former2 = uf2[0][0] ? uf2[0][0].x : uf2[2][0].x; //point2.backward
    let latter2 = uf3[0][0] ? uf3[0][0].x : uf3[2][0].x; //point2.forward

    let refPt1 = GetRefPoint(point1);
    let refPt2 = GetRefPoint(point2);
    let line1 = uf1[0][0] ? PointToGlobal([uf1[0][0], uf1[1][0]], refPt1) : PointToGlobal([uf1[2][0], uf1[2][1]], refPt1);
    let line2 = uf2[0][0] ? PointToGlobal([uf2[0][0], uf2[1][0]], refPt2) : PointToGlobal([uf2[2][0], uf2[2][1]], refPt2);

    let isCross = Boolean(TwoLineIntersect(line1, line2)) && !pk1.includes("K");

    //위의 로직으로 사용시, K값을 가진 변수가 앞에 나오는 경우, 교차하더라도 처리가 되지 않음 20220602 byDrlim

    let former3 = uf2[0].length > 0 ? uf2[0][0].y : uf2[2][0].y;
    let latter3 = uf3[0].length > 0 ? uf3[0][0].y : uf3[2][0].y;
    let former0 = uf0[0][0] ? uf0[0][0].y : uf0[2][0].y;
    let latter0 = uf1[0][0] ? uf1[0][0].y : uf1[2][0].y;

    uf0.forEach((pts, idx) => plate0[idx].push(...PointToGlobal(pts, refPt1)));
    uf1.forEach((pts, idx) => plate1[idx].push(...PointToGlobal(pts, refPt1)));
    uf2.forEach((pts, idx) => plate2[idx].push(...PointToGlobal(pts, refPt2)));
    uf3.forEach((pts, idx) => plate3[idx].push(...PointToGlobal(pts, refPt2)));

    let plate0_ = [[], [], []];
    let plate1_ = [[], [], []];
    uf0.forEach((pts, idx) => plate0_[idx].push(...PointToGlobal(pts, { ...refPt1, y: 0, z: 0 })));
    uf1.forEach((pts, idx) => plate1_[idx].push(...PointToGlobal(pts, { ...refPt1, y: 0, z: 0 })));

    if (point2.mainStation > point1.mainStation) {
        // outborder
        if (!IsSameFlange(uf0, uf1)) {
            if (former1 < latter1) {
                //point1에서 좁아지는 경우
                if (uf1[2][0]) {
                    //폐합에서 폐합인 경우
                    try {
                        console.log("herer")
                        plate1[2][0] = GetPointBasedLength([plate1[2][0], plate2[2][0]], (latter1 - former1) * 2); //숫자 2는 확폭시 경사도
                        plate1[2][1] = GetPointBasedLength([plate1[2][1], plate2[2][1]], (latter1 - former1) * 2);
                        plate1[2][2] = GetPointBasedLength([plate1[2][2], plate2[2][2]], (latter1 - former1) * 2);
                        plate1[2][3] = GetPointBasedLength([plate1[2][3], plate2[2][3]], (latter1 - former1) * 2);
                    } catch (e) {
                        console.log("플레이트가 분할 폐합 과정중에 오류 발생");
                    }
                    if (!uf0[2][0]) {
                        //point1.backward가 개구인경우, 개구에서 폐합으로 갈경우
                        plate0[2][0] = plate0[0][0];
                        plate0[2][1] = plate0[1][0];
                        plate0[2][2] = plate0[1][3];
                        plate0[2][3] = plate0[0][3];
                        plate0[0] = [];
                        plate0[1] = [];
                    }
                }
                for (let k in uf1) {
                    plate0[k].forEach(element => result[k].push(element)); //개구에서 개구로 좁아지는 경우 폐합에서 개구로 좁아지는 경우 오류발생
                }
            }
        }

        if (uf1[2].length === 0 && uf0[2].length > 0) {
            //폐합에서 분할로 시작 // 외측과 내측필렛이 같은요소에 작용하면 오류가 발생할 것으로 예상, 필렛이 없는 폐합요소에만 외측 챔퍼 적용
            let filletPoints = GenFlangeFilletShapes(plate1, plate2, false, filletR, smoothness);
            result[0].push(...filletPoints[0]);
            result[1].push(...filletPoints[1]);
            // result[2].push(...plate0[2]) //임시삭제, 폐합과 개구단면이 동시에 존재하게됨 ==> 이동
        } else {
            //폐합=>폐합 or 분할=>폐합 or 분할=>분할
            if (!FisB0 && latter0 - former0 > 100 && latter0 - former0 < 700) {
                //단부절취인경우
                //단부에서 오류나는 내용 임시적으로 해결 2020.7.13 by dr.lim
                for (let k in uf1) {
                    if (uf1[k].length > 0) {
                        let thickness = Math.abs(uf1[k][0].y - uf1[k][3].y);
                        let npt2 = GetPointBasedLength([plate1[k][2], plate2[k][2]], thickness);
                        let npt3 = GetPointBasedLength([plate1[k][3], plate2[k][3]], thickness);
                        let nplate1 = [plate1[k][0], plate1[k][1], npt2, npt3];
                        let nplate2 = [
                            plate0[k][3],
                            plate0[k][2],
                            { x: npt2.x, y: npt2.y, z: plate0[k][2].z },
                            { x: npt3.x, y: npt3.y, z: plate0[k][3].z },
                        ];
                        let filletList = [[], [], [], []];
                        for (let l = 0; l < 4; l++) {
                            let radius = l < 2 ? endCutFilletR : endCutFilletR - thickness;
                            filletList[l].push(...GetFilletPoints(nplate2[l], nplate1[l], plate2[k][l], radius, 8));
                        }
                        result[k].push(...nplate2);
                        for (let l in filletList[0]) {
                            result[k].push(filletList[0][l], filletList[1][l], filletList[2][l], filletList[3][l]);
                        }
                        // result[k].push(plate2[k][0],plate2[k][1],npt2, npt3)
                    }
                }
            } else {
                //단부절취가 아닌경우 일반경우 해당
                for (let k in uf1) {
                    if (!isCross) {
                        plate1[k].forEach(element => result[k].push(element));
                    } else {
                        // console.log("플랜지 단면교차로 인한 삭제 : ", pk1); TODO: 주석 다시 풀어야함
                    }
                }
            }
        }

        if (uf2[2].length === 0 && uf3[2].length > 0) {
            // point2 분할에서 폐합으로
            let filletPoints = GenFlangeFilletShapes(plate1, plate2, true, filletR, smoothness);
            result[0].push(...filletPoints[0]);
            result[1].push(...filletPoints[1]);
        } else {
            //point2 폐합=>분할, 폐합=>폐합, 분할=>분할
            let spCheck = false;
            splicer.forEach(function (sp) {
                if (pk2.substr(2, 2) === sp) {
                    spCheck = true;
                }
            });
            if (!FisB && former3 - latter3 > 100 && former3 - latter3 < 700) {
                // 단부절취인 경우 단부에서 오류나는 내용 임시적으로 해결 2020.7.13 by dr.lim
                for (let k in uf2) {
                    if (uf2[k].length > 0) {
                        let thickness = Math.abs(uf2[k][0].y - uf2[k][3].y);
                        let npt2 = GetPointBasedLength([plate2[k][2], plate1[k][2]], thickness);
                        let npt3 = GetPointBasedLength([plate2[k][3], plate1[k][3]], thickness);
                        let nplate1 = [plate2[k][0], plate2[k][1], npt2, npt3];
                        let nplate2 = [
                            plate3[k][3],
                            plate3[k][2],
                            { x: npt2.x, y: npt2.y, z: plate3[k][2].z },
                            { x: npt3.x, y: npt3.y, z: plate3[k][3].z },
                        ];
                        let filletList = [[], [], [], []];
                        for (let l = 0; l < 4; l++) {
                            let radius = l < 2 ? endCutFilletR : endCutFilletR - thickness;
                            filletList[l].push(...GetFilletPoints(plate1[k][l], nplate1[l], nplate2[l], radius, 8));
                        }
                        for (let l in filletList[0]) {
                            result[k].push(filletList[0][l], filletList[1][l], filletList[2][l], filletList[3][l]);
                        }
                        // result[k].push(plate2[k][0],plate2[k][1],npt2, npt3)
                        result[k].push(...nplate2);
                    }
                }
            }
            let isWiden = false;
            if (!FisB) {
                //point2 앞뒤단면이 상이한경우
                if (former2 > latter2 && pk2.substr(2, 2) !== "K6") {
                    //point2에서 플렌지 폭이 넓어지는 경우
                    if (uf2[2][0]) {
                        ////point2.backward 폐합인경우
                        plate2[2][0] = GetPointBasedLength([plate2[2][0], plate1[2][0]], (former2 - latter2) * 2);
                        plate2[2][1] = GetPointBasedLength([plate2[2][1], plate1[2][1]], (former2 - latter2) * 2);
                        plate2[2][2] = GetPointBasedLength([plate2[2][2], plate1[2][2]], (former2 - latter2) * 2);
                        plate2[2][3] = GetPointBasedLength([plate2[2][3], plate1[2][3]], (former2 - latter2) * 2);
                        if (!uf3[2][0]) {
                            //point2.forward가 개구인경우 폐합=>개구로 가는 경우
                            plate3[2][0] = plate3[0][0];
                            plate3[2][1] = plate3[1][0];
                            plate3[2][2] = plate3[1][3];
                            plate3[2][3] = plate3[0][3];
                            plate3[0] = [];
                            plate3[1] = [];
                        }
                    }
                    for (let k in uf2) {
                        plate2[k].forEach(element => result[k].push(element));
                    }
                    for (let k in uf2) {
                        plate3[k].forEach(element => result[k].push(element));
                    }
                    isWiden = true;
                }
            }
            if ((spCheck && !isWiden) || (uf3[2].length === 0 && uf2[2].length > 0)) {
                //형고 높이가 100mm 이상인 경우에만 반영 //폭이 넓어지는 경우에는 이미 선반영이 되어 있어 제외함.
                for (let k in uf2) {
                    plate2[k].forEach(element => result[k].push(element));
                }
            }
        }
    } else {
        //
        splicer.forEach(function (sp) {
            if (pk2.substr(2, 2) === sp) {
                for (let k in uf2) {
                    plate2[k].forEach(element => result[k].push(element));
                }
            }
        });
    }
    return result;
}

function GenWebShape(sectionPointDict, pk1, pk2, point1, point2, webIndex, splicer, endCutFilletR, entrance, check = false) {
    let result = [[], [], []];
    let L0 = sectionPointDict[pk1].backward.web[webIndex];
    let L1 = sectionPointDict[pk1].forward.web[webIndex];
    let L2 = sectionPointDict[pk2].backward.web[webIndex];
    let L3 = sectionPointDict[pk2].forward.web[webIndex];

    let wplate0 = [];
    let wplate1 = [];
    let wplate2 = [];
    let wplate3 = [];

    let refPt1 = GetRefPoint(point1);
    let refPt2 = GetRefPoint(point2);

    L0.forEach(element => wplate0.push(PointToGlobal(element, refPt1)));
    L1.forEach(element => wplate1.push(PointToGlobal(element, refPt1)));
    L2.forEach(element => wplate2.push(PointToGlobal(element, refPt2)));
    L3.forEach(element => wplate3.push(PointToGlobal(element, refPt2)));

    let line1 = [point1, wplate1[0]];
    let line2 = [point2, wplate2[0]];
    let isCross = Boolean(TwoLineIntersect(line1, line2)) && !pk1.includes("K");

    if (point2.mainStation > point1.mainStation) {
        if (pk1.substr(2, 2) === "K1" && entrance.add) {
            let ent = webEntrance(wplate1, wplate2, true, entrance);
            for (let k in ent) {
                ent[k].forEach(element => result[k].push(element));
            }
        } else {
            let indent = L1[0].y - L0[0].y; // bottom point of web
            if (indent > 100 && indent < 700) {
                let fpt = GetFilletPoints(wplate0[0], wplate1[0], wplate2[0], endCutFilletR, 8);
                let fpt3 = GetFilletPoints(wplate0[3], wplate1[3], wplate2[3], endCutFilletR, 8);
                for (let l in fpt) {
                    result[2].push(fpt[l], wplate1[1], wplate1[2], fpt3[l]);
                }
            } else {
                if (!isCross) {
                    wplate1.forEach(element => result[2].push(element));
                } else {
                    console.log("복부판 단면교차로 인한 삭제 : ", pk1);
                }
            }
        }
        let FisB = true;
        for (let i in L2) {
            if (L2[i] !== L3[i]) {
                FisB = false;
            }
        }
        let spCheck = false;
        splicer.forEach(function (sp) {
            if (pk2.substr(2, 2) === sp) {
                spCheck = true;
            }
        });
        if (!FisB || spCheck) {
            if (pk2.substr(2, 2) === "K6" && entrance.add) {
                let ent = webEntrance(wplate2, wplate1, false, entrance);
                for (let k in ent) {
                    ent[k].forEach(element => result[k].push(element));
                }
            } else {
                let indent = L2[0].y - L3[0].y; // bottom point of web
                if (indent > 100 && indent < 700) {
                    let fpt = GetFilletPoints(wplate1[0], wplate2[0], wplate3[0], endCutFilletR, 8);
                    let fpt3 = GetFilletPoints(wplate1[3], wplate2[3], wplate3[3], endCutFilletR, 8);
                    for (let l in fpt) {
                        result[2].push(fpt[l], wplate2[1], wplate2[2], fpt3[l]);
                    }
                } else {
                    wplate2.forEach(element => result[2].push(element));
                }
            }
        }
    } else {
        //
        splicer.forEach(function (sp) {
            if (pk2.substr(2, 2) === sp) {
                wplate2.forEach(element => result[2].push(element));
            }
        });
    }
    return result;
}

function GenFlangePoints(flangePointList) {
    let openStatusList = [];
    let openStatus = undefined;
    let points = [[], [], []];
    let add = 0;
    for (let i = 0; i < flangePointList.length; i++) {
        if (flangePointList[i][2].length > 0) {
            openStatus = false;
        } else if (flangePointList[i][0].length > 0) {
            openStatus = true;
        }
        if (openStatusList[openStatusList.length - 1] === false && openStatus === true) {
            points.push([], [], []);
            add = 3;
        }
        flangePointList[i].forEach((el, j) => points[j + add].push(...el));
        if (openStatus !== undefined) {
            openStatusList.push(openStatus);
        }
    }
    return points;
}

function GenFlangeSidePoints(sectionPointDict, pk1, pk2, point1, point2, sideKey, splicer, endCutFilletR) {
    // 박스형 거더의 상하부플레이트 개구와 폐합에 대한 필렛을 위해 개발되었으며, 개구->폐합, 폐합->개구에 대해서만 가능하다,
    // 개구->폐합->개구로 2단계의 경우에는 오류가 발생할 수 있음, 2020.05.25 by drlim
    let result = [[], [], []];
    const err = 0.1;
    // let uf0 = sectionPointDict[pk1].backward["input"];
    let uf0 = sectionPointDict[pk1].backward[sideKey];
    let uf1 = sectionPointDict[pk1].forward[sideKey];
    let uf2 = sectionPointDict[pk2].backward[sideKey];
    let uf3 = sectionPointDict[pk2].forward[sideKey];
    let FisB = uf2[0] === uf3[0]; //기준높이가 변화하는 경우
    // let FisB0 = uf0[0] === uf1[0]; //기준높이가 변화하는 경우
    let dz1 = 0; // point1.z //종단선형을 따르는 경우
    let dz2 = 0; // point2.z //종단선형을 따르는 경우
    let plate0 = [
        [],
        [],
        [
            { x: point1.girderStation, y: uf0[0] + dz1, z: 0 },
            { x: point1.girderStation, y: uf0[1] + dz1, z: 0 },
        ],
    ];
    let plate1 = [
        [],
        [],
        [
            { x: point1.girderStation, y: uf1[0] + dz1, z: 0 },
            { x: point1.girderStation, y: uf1[1] + dz1, z: 0 },
        ],
    ];
    let plate2 = [
        [],
        [],
        [
            { x: point2.girderStation, y: uf2[0] + dz2, z: 0 },
            { x: point2.girderStation, y: uf2[1] + dz2, z: 0 },
        ],
    ];
    let plate3 = [
        [],
        [],
        [
            { x: point2.girderStation, y: uf3[0] + dz2, z: 0 },
            { x: point2.girderStation, y: uf3[1] + dz2, z: 0 },
        ],
    ];
    if (point2.mainStation - point1.mainStation > err) {
        if (uf1[0] - uf0[0] > 100 && uf1[0] - uf0[0] < 700) {
            let thickness = Math.abs(uf1[0] - uf1[1]);
            let npt2 = GetPointBasedLength([plate1[2][0], plate2[2][0]], thickness);
            let npt3 = GetPointBasedLength([plate1[2][1], plate2[2][1]], thickness);
            let nplate1 = plate0[2][1];
            let nplate2 = { x: npt2.x, y: plate0[2][1].y, z: 0 };
            let filletList = [[], []];
            let radius = endCutFilletR;
            filletList[0].push(...GetFilletPoints(nplate1, plate1[2][0], plate2[2][0], radius, 8));
            radius = endCutFilletR - thickness;
            filletList[1].push(...GetFilletPoints(nplate2, npt3, plate2[2][1], radius, 8));
            result[2].push(nplate1, nplate2);
            for (let l in filletList[0]) {
                result[2].push(filletList[0][l], filletList[1][l]);
            }
        } else {
            for (let k in plate1) {
                plate1[k].forEach(element => result[k].push(element));
            }
        }
        let spCheck = false;
        splicer.forEach(function (sp) {
            if (pk2.substr(2, 2) === sp) {
                spCheck = true;
            }
        });
        if (!FisB || spCheck) {
            //형고 높이가 100mm 이상인 경우에만 반영
            if (uf2[0] - uf3[0] > 100 && uf2[0] - uf3[0] < 700) {
                let thickness = Math.abs(uf2[0] - uf2[1]);
                let npt2 = GetPointBasedLength([plate2[2][0], plate1[2][0]], thickness);
                let npt3 = GetPointBasedLength([plate2[2][1], plate1[2][1]], thickness);
                let nplate1 = plate3[2][1];
                let nplate2 = { x: npt2.x, y: plate3[2][1].y, z: 0 };
                let filletList = [[], []];
                let radius = endCutFilletR;
                filletList[0].push(...GetFilletPoints(plate1[2][0], plate2[2][0], nplate1, radius, 8));
                radius = endCutFilletR - thickness;
                filletList[1].push(...GetFilletPoints(plate1[2][1], npt3, nplate2, radius, 8));

                for (let l in filletList[0]) {
                    result[2].push(filletList[0][l], filletList[1][l]);
                }
                result[2].push(nplate1, nplate2);
            } else {
                for (let k in plate2) {
                    plate2[k].forEach(element => result[k].push(element));
                }
            }
        }
    } else {
        //
        splicer.forEach(function (sp) {
            if (pk2.substr(2, 2) === sp) {
                for (let k in plate2) {
                    plate2[k].forEach(element => result[k].push(element));
                }
            }
        });
    }
    return result;
}

function GenWebSidePoints(sectionPointDict, pk1, pk2, point1, point2, sideKey, splicer, endCutFilletR, entrance) {
    let result = [[], [], []];
    let uf0 = sectionPointDict[pk1].backward[sideKey];
    let uf1 = sectionPointDict[pk1].forward[sideKey];
    let uf2 = sectionPointDict[pk2].backward[sideKey];
    let uf3 = sectionPointDict[pk2].forward[sideKey];
    let FisB = uf2[0] === uf3[0]; //기준높이가 변화하는 경우
    let spCheck = false;
    splicer.forEach(function (sp) {
        if (pk2.substr(2, 2) === sp) {
            spCheck = true;
        }
    });

    let dz1 = 0; // point1.z //종단선형을 따르는 경우
    let dz2 = 0; // point2.z //종단선형을 따르는 경우
    let plate0 = [
        [],
        [],
        [
            { x: point1.girderStation, y: uf0[0] + dz1, z: 0 }, // 절대좌표 출력시에는 y좌표에 point1.z좌표를 더함
            { x: point1.girderStation, y: uf0[1] + dz1, z: 0 },
        ],
    ];
    let plate1 = [
        [],
        [],
        [
            { x: point1.girderStation, y: uf1[0] + dz1, z: 0 },
            { x: point1.girderStation, y: uf1[1] + dz1, z: 0 },
        ],
    ];
    let plate2 = [
        [],
        [],
        [
            { x: point2.girderStation, y: uf2[0] + dz2, z: 0 },
            { x: point2.girderStation, y: uf2[1] + dz2, z: 0 },
        ],
    ];
    let plate3 = [
        [],
        [],
        [
            { x: point2.girderStation, y: uf3[0] + dz2, z: 0 },
            { x: point2.girderStation, y: uf3[1] + dz2, z: 0 },
        ],
    ];

    if (pk1.substr(2, 2) === "K1" && entrance.add) {
        let ent = webEntrance2D(plate1[2], plate2[2], true, entrance);
        for (let k in ent) {
            ent[k].forEach(element => result[k].push(element));
        }
    } else {
        if (uf1[0] - uf0[0] > 100 && uf1[0] - uf0[0] < 700) {
            let filletList = [];
            let radius = endCutFilletR;
            filletList.push(...GetFilletPoints(plate0[2][0], plate1[2][0], plate2[2][0], radius, 8));

            for (let l in filletList) {
                result[2].push(filletList[l], plate1[2][1]);
            }
            // result[2].push(plate3[2][0], plate3[2][1]);
        } else {
            for (let k in plate1) {
                plate1[k].forEach(element => result[k].push(element));
            }
        }
    }
    if (!FisB || spCheck) {
        if (pk2.substr(2, 2) === "K6" && entrance.add) {
            let ent = webEntrance2D(plate2[2], plate1[2], false, entrance);
            for (let k in ent) {
                ent[k].forEach(element => result[k].push(element));
            }
        } else {
            if (uf2[0] - uf3[0] > 100 && uf2[0] - uf3[0] < 700) {
                let filletList = [];
                let radius = endCutFilletR;
                filletList.push(...GetFilletPoints(plate1[2][0], plate2[2][0], plate3[2][0], radius, 8));

                for (let l in filletList) {
                    result[2].push(filletList[l], plate3[2][1]);
                }
                // result[2].push(plate3[2][0], plate3[2][1]);
            } else {
                for (let k in plate1) {
                    plate2[k].forEach(element => result[k].push(element));
                }
            }
        }
    }
    return result;
}

function GenGirderSideDraw(sidePoints, sectionPointNum, index1, index2, meta = {}) {
    //측면도 그리기
    let meshes = [];
    let ptsL1 = [];
    let ptsR1 = [];
    let ptsC1 = [];
    let ptsL2 = [];
    let ptsR2 = [];
    let ptsC2 = [];
    for (let j in sidePoints) {
        let pts1 = [];
        let pts2 = [];
        for (let i = 0; i < sidePoints[j].length; i += sectionPointNum) {
            pts1.push(sidePoints[j][i + index1]);
            pts2.push(sidePoints[j][i + index2]);
        }
        if (j == 0) {
            ptsL1.push(...pts1);
            ptsL2.push(...pts2);
        }
        if (j == 1) {
            ptsR1.push(...pts1);
            ptsR2.push(...pts2);
        }
        if (j == 2) {
            ptsC1.push(...pts1);
            ptsC2.push(...pts2);
        }
    }
    if (ptsC1.length === 0) {
        meshes.push(new Line([...ptsL1, ...ptsL2.reverse()], "CYAN", true, undefined, meta));
        meshes.push(new Line([...ptsR1, ...ptsR2.reverse()], "CYAN", true, undefined, meta));
    } else if (ptsC1.length > 0 && ptsL1.length > 0 && ptsR1.length > 0) {
        if (ptsC1[0].x === ptsL1[ptsL1.length - 1].x) {
            meshes.push(
                new Line([...ptsL1, ...ptsC1, ...ptsC2.reverse(), ...ptsR1.reverse(), ...ptsR2, ...ptsL2.reverse()], "CYAN", true, undefined, meta)
            );
        } else {
            meshes.push(
                new Line([...ptsL1.reverse(), ...ptsC1.reverse(), ...ptsC2, ...ptsR1, ...ptsR2.reverse(), ...ptsL2], "CYAN", true, undefined, meta)
            );
        }
    } else if (ptsL1.length === 0 && ptsL1.length === 0) {
        meshes.push(new Line([...ptsC1.reverse(), ...ptsC2], "CYAN", true, undefined, meta));
    }

    return meshes;
}

function GenFlangePlanDraw(flangePointList, meta = {}) {
    let result = [];
    let lpt = [];
    let lpt2 = [];
    let rpt = [];
    let rpt2 = [];
    let openStatusList = [];
    let openStatus = undefined;
    for (let i = 0; i < flangePointList.length; i++) {
        if (flangePointList[i][2].length > 0) {
            openStatus = false;
            flangePointList[i][2].forEach(function (pt, ii) {
                if (ii % 4 === 0) {
                    lpt.push(pt);
                }
            });
            flangePointList[i][2].forEach(function (pt, ii) {
                if (ii % 4 === 1) {
                    rpt.push(pt);
                }
            });
        } else if (flangePointList[i][0].length > 0) {
            openStatus = true;
            flangePointList[i][0].forEach(function (pt, ii) {
                if (ii % 4 === 0) {
                    lpt.push(pt);
                }
            });
            flangePointList[i][0].forEach(function (pt, ii) {
                if (ii % 4 === 1) {
                    lpt2.push(pt);
                }
            });
            flangePointList[i][1].forEach(function (pt, ii) {
                if (ii % 4 === 0) {
                    rpt.push(pt);
                }
            });
            flangePointList[i][1].forEach(function (pt, ii) {
                if (ii % 4 === 1) {
                    rpt2.push(pt);
                }
            });
        }
        if (openStatusList[openStatusList.length - 1] === true && openStatus === false) {
            lpt.unshift(...lpt2.reverse());
            rpt.unshift(...rpt2.reverse());
            lpt2 = [];
            rpt2 = [];
        }
        if (openStatus !== undefined) {
            openStatusList.push(openStatus);
        }
    }
    lpt.push(...lpt2.reverse());
    rpt.push(...rpt2.reverse());
    if (openStatusList.some(value => value === false)) {
        result = [new Line([...lpt, ...rpt.reverse()], "CYAN", true, undefined, meta)];
    } else {
        result = [new Line(lpt, "CYAN", true, undefined, meta), new Line(rpt, "CYAN", true, undefined, meta)];
    }
    return result;
}

function GenWebPlanDraw(points, sectionPointNum, index1, index2, layer, meta = {}) {
    //강박스 일반도 그리기
    let result = [];
    let color = layer ? layer : "CYAN";
    let ptsL1 = [];
    let ptsR1 = [];
    let ptsC1 = [];
    let ptsL2 = [];
    let ptsR2 = [];
    let ptsC2 = [];
    for (let j in points) {
        let pts1 = [];
        let pts2 = [];
        for (let i in points[j]) {
            if (i % sectionPointNum === index1) {
                pts1.push(points[j][i]);
            } else if (i % sectionPointNum === index2) {
                pts2.push(points[j][i]);
            }
        }
        if (j == 0) {
            ptsL1.push(...pts1);
            ptsL2.push(...pts2);
        }
        if (j == 1) {
            ptsR1.push(...pts1);
            ptsR2.push(...pts2);
        }
        if (j == 2) {
            ptsC1.push(...pts1);
            ptsC2.push(...pts2);
        }
    }
    if (ptsC1.length === 0) {
        result.push(new Line([...ptsL1, ...ptsL2.reverse()], color, true, undefined, meta));
        result.push(new Line([...ptsR1, ...ptsR2.reverse()], color, true, undefined, meta));
    } else if (ptsC1.length > 0 && ptsL1.length > 0 && ptsR1.length > 0) {
        if (ptsC1[0].x === ptsL1[ptsL1.length - 1].x && ptsC1[0].y === ptsL1[ptsL1.length - 1].y) {
            //시점박스부
            result.push(
                new Line([...ptsL1, ...ptsC1, ...ptsC2.reverse(), ...ptsR1.reverse(), ...ptsR2, ...ptsL2.reverse()], color, true, undefined, meta)
            );
        } else if (ptsC1[ptsC1.length - 1].x === ptsL1[0].x && ptsC1[ptsC1.length - 1].y === ptsL1[0].y) {
            //종점박스부
            result.push(
                new Line([...ptsL1.reverse(), ...ptsC1.reverse(), ...ptsC2, ...ptsR1, ...ptsR2.reverse(), ...ptsL2], color, true, undefined, meta)
            );
        } else {
            //연속부 박스부
            // result.push(ToLine(
            //   [...ptsL1, ...ptsR1.reverse()], "RED", true));
        }
    } else if (ptsL1.length === 0 && ptsL1.length === 0) {
        result.push(new Line([...ptsC1.reverse(), ...ptsC2], color, true, undefined, meta));
    }
    return result;
}

function GenRibPlanDraw(points, sectionPointNum, index1, index2, layer, meta = {}) {
    //강박스 일반도 그리기
    let result = [];
    let color = layer ? layer : "MAGENTA";
    for (let j in points) {
        let pts1 = [];
        let pts2 = [];
        for (let i in points[j]) {
            if (i % sectionPointNum === index1) {
                pts1.push(points[j][i]);
            } else if (i % sectionPointNum === index2) {
                pts2.push(points[j][i]);
            }
        }
        result.push(new Line([...pts1, ...pts2.reverse()], color, true, undefined, meta));
    }
    return result;
}

function GenConcPlanDraw(points, index1, index2, layer, meta = {}) {
    //강박스 일반도 그리기
    let matName = layer ? layer : "GRAY2";
    let pts1 = [];
    let pts2 = [];
    for (let j in points) {
        pts1.push(points[j][index1]);
        pts2.push(points[j][index2]);
    }
    let result = [new Hatch([...pts1, ...pts2.reverse()], matName, meta)];
    return result;
}

function GenWebWeldingLineDict(points) {
    //강박스 일반도 그리기
    // let result = {};
    let bottom = [];
    let top = [];
    let index1 = 0;
    let index2 = 1;
    let sectionPointNum = 4;
    // let color = layer ? layer : "CYAN";
    let ptsL1 = [];
    let ptsR1 = [];
    let ptsC1 = [];
    let ptsL2 = [];
    let ptsR2 = [];
    let ptsC2 = [];
    for (let j in points) {
        let pts1 = [];
        let pts2 = [];
        for (let i in points[j]) {
            if (i % sectionPointNum === index1) {
                pts1.push(points[j][i]);
            } else if (i % sectionPointNum === index2) {
                pts2.push(points[j][i]);
            }
        }
        if (j == 0) {
            ptsL1.push(...pts1);
            ptsL2.push(...pts2);
        }
        if (j == 1) {
            ptsR1.push(...pts1);
            ptsR2.push(...pts2);
        }
        if (j == 2) {
            ptsC1.push(...pts1);
            ptsC2.push(...pts2);
        }
    }
    if (ptsC1.length === 0) {
        bottom = ptsL1;
        top = ptsR2;
    } else if (ptsC1.length > 0 && ptsL1.length > 0 && ptsR1.length > 0) {
        if (ptsC1[0].x === ptsL1[ptsL1.length - 1].x && ptsC1[0].y === ptsL1[ptsL1.length - 1].y) {
            bottom = [...ptsL1, ...ptsC1];
            top = [...ptsR2, ...ptsC2];
        } else {
            bottom = [...ptsC1, ...ptsL1];
            top = [...ptsC2, ...ptsR2];
        }
    } else if (ptsL1.length === 0 && ptsL1.length === 0) {
        bottom = ptsC1;
        top = ptsC2;
    }
    return { bottom, top };
}

function GenRibWeldingLineDict(points) {
    let result = [];
    let sectionPointNum = 4;
    let index1 = 0;
    for (let j in points) {
        let pts1 = [];
        for (let i in points[j]) {
            if (i % sectionPointNum === index1) {
                pts1.push(points[j][i]);
            }
        }
        result.push(pts1);
    }
    return result;
}

function GenFlangeFilletShapes(plate1, plate2, isForward, radius, smoothness) {
    let filletPoint = [[], [], [], []];

    let plt1 = isForward ? plate1 : plate2;
    let plt2 = isForward ? plate2 : plate1;
    let result = [[], []];

    for (let ii = 0; ii < 2; ii++) {
        let p1 = new THREE.Vector3(plt1[0][ii + 1].x, plt1[0][ii + 1].y, plt1[0][ii + 1].z);
        let p2 = new THREE.Vector3(plt2[0][ii + 1].x, plt2[0][ii + 1].y, plt2[0][ii + 1].z);
        let p3 = new THREE.Vector3(plt2[1][ii + 1].x, plt2[1][ii + 1].y, plt2[1][ii + 1].z);
        filletPoint[ii] = GetFilletPoints(p1, p2, p3, radius, smoothness);
    }
    for (let ii = 0; ii < 2; ii++) {
        let p1 = new THREE.Vector3(plt1[1][ii + 1].x, plt1[1][ii + 1].y, plt1[1][ii + 1].z);
        let p2 = new THREE.Vector3(plt2[1][ii + 1].x, plt2[1][ii + 1].y, plt2[1][ii + 1].z);
        let p3 = new THREE.Vector3(plt2[0][ii + 1].x, plt2[0][ii + 1].y, plt2[0][ii + 1].z);
        filletPoint[ii + 2] = GetFilletPoints(p1, p2, p3, radius, smoothness);
    }
    for (let jj = 0; jj < smoothness + 2; jj++) {
        let kk = isForward ? jj : smoothness + 1 - jj;
        result[0].push(plt2[0][0]);
        result[0].push(filletPoint[0][kk]);
        result[0].push(filletPoint[1][kk]);
        result[0].push(plt2[0][3]);
        result[1].push(plt2[1][0]);
        result[1].push(filletPoint[2][kk]);
        result[1].push(filletPoint[3][kk]);
        result[1].push(plt2[1][3]);
    }
    return result;
}

export function GenWebEntrance(wplate1, wplate2, isForward, entrance) {
    let result = [[], [], []];
    let b1 = entrance.b1;
    let h1 = entrance.h1;
    let d1 = entrance.d1;
    let r = entrance.r;
    let smoothness = 8;
    let dpt0 = GetPointBasedLength([wplate1[0], wplate2[0]], d1);
    let dpt1 = GetPointBasedLength([wplate1[1], wplate2[1]], d1);
    let dpt2 = GetPointBasedLength([wplate1[2], wplate2[2]], d1);
    let dpt3 = GetPointBasedLength([wplate1[3], wplate2[3]], d1);
    let l1 = GetPointBasedLength([wplate1[0], wplate1[1]], b1 + h1);
    let l2 = GetPointBasedLength([wplate1[3], wplate1[2]], b1 + h1);
    let r1 = GetPointBasedLength([wplate1[0], wplate1[1]], b1);
    let r2 = GetPointBasedLength([wplate1[3], wplate1[2]], b1);
    let l11 = GetPointBasedLength([dpt0, dpt1], b1 + h1);
    let l21 = GetPointBasedLength([dpt3, dpt2], b1 + h1);
    let r11 = GetPointBasedLength([dpt0, dpt1], b1);
    let r21 = GetPointBasedLength([dpt3, dpt2], b1);

    let newPlate1 = [[wplate1[0], r1, r2, wplate1[3]], [wplate1[1], l1, l2, wplate1[2]], []];
    let newPlate2 = [[dpt0, r11, r21, dpt3], [dpt1, l11, l21, dpt2], []];
    if (isForward) {
        let filletPoints = GenFlangeFilletShapes(newPlate1, newPlate2, isForward, r, smoothness);
        result[0].push(wplate1[0], r1, r2, wplate1[3]);
        result[0].push(...filletPoints[0]);
        result[1].push(wplate1[1], l1, l2, wplate1[2]);
        result[1].push(...filletPoints[1]);
    } else {
        let filletPoints = GenFlangeFilletShapes(newPlate2, newPlate1, isForward, r, smoothness);
        result[0].push(...filletPoints[0]);
        result[0].push(wplate1[0], r1, r2, wplate1[3]);
        result[1].push(...filletPoints[1]);
        result[1].push(wplate1[1], l1, l2, wplate1[2]);
    }
    result[2].push(dpt0, dpt1, dpt2, dpt3);
    return result;
}

function IsSameFlange(plate1, plate2) {
    let result = true;
    let err = 0.1;
    for (let i in plate1) {
        for (let j in plate1[i]) {
            if (plate2[i][j]) {
                if (Math.abs(plate1[i][j].x - plate2[i][j].x) > err || Math.abs(plate1[i][j].y - plate2[i][j].y) > err) {
                    result = false; //오류발생, 값이 급격하게 차이나는 경우 입력하는 방법이 있어야함
                }
            } else {
                result = false;
            }
        }
    }
    return result;
}
