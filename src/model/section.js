import {
    ToDimAlign,
    IntersectionPointOnSpline,
    Layout2D,
    Line,
    LineToOffsetSpline,
    paperSize,
    Plot2D,
    GetPointsWithBulge,
    TwoPointsLength,
} from "@nexivil/package-modules";
import { _ } from "global";
import { GenDefaultGridPointDict } from "./grid";
import { GetPointSectionInfo } from "./utils";

export function GenBasicSectionsFn(girderLayout, basicSectionInfo) {
    const common = basicSectionInfo.common;
    const end = basicSectionInfo.end;
    const support = basicSectionInfo.support;
    const sShape = basicSectionInfo.se.start;
    const eShape = basicSectionInfo.se.end;
    const properties = {
        title: "교량단면요약도",
        size: "A1",
        scale: 50,
        leftMargin: 10,
        rightMargin: 10,
        topMargin: 10,
        bottomMargin: 50,
    };

    let commonThickness = 20;
    let girderNumber = girderLayout.girderSplines.length;
    let alignment = girderLayout.alignment;
    let lLine = LineToOffsetSpline(girderLayout.girderSplines[0], -common.SlabLeft);
    let rLine = LineToOffsetSpline(girderLayout.girderSplines[girderLayout.girderSplines.length - 1], common.SlabRight);
    const seShape = {
        start: {
            A: sShape.A,
            D: sShape.B,
            F: sShape.C,
            G: sShape.D,
            isStraight: true,
            endSlabH: end.SlabH,
            slabH: support.SlabH,
        },
        end: {
            A: eShape.A,
            D: eShape.B,
            F: eShape.C,
            G: eShape.D,
            isStraight: true,
            endSlabH: end.SlabH,
            slabH: support.SlabH,
        },
    };
    const sectionInfo = {
        B: common.B,
        H: common.H ? common.H : end.H,
        UL: common.T ? common.T / 2 : common.B / 2,
        UR: common.T ? common.T / 2 : common.B / 2,
    };
    const centerThickness = support.SlabH + support.HaunchH + common.PavementT;
    const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: -sectionInfo.UL, y: -centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let gridPointDict = GenDefaultGridPointDict(girderLayout, seShape);
    let deckPointDicts = [];
    let sectionPoints = [];
    let supportKey = [];
    for (let key in girderLayout.gridKeyPoint) {
        supportKey.push(key);
    }
    let supportNum = supportKey.length - 2;

    for (let i = 0; i < supportNum; i++) {
        sectionPoints.push([]);
        for (let j = 0; j < girderNumber; j++) {
            let ptName = "G" + (j + 1).toFixed(0) + "S" + (i + 1).toFixed(0);
            let point = gridPointDict[ptName];
            let gradient = common.isFlat ? 0 : point.gradientY;
            let rad = Math.atan(gradient);
            let cos = Math.cos(rad);
            let sin = Math.sin(rad);
            let bottomY = i === 0 || i === supportNum - 1 ? end.SlabH + common.PavementT + end.H - end.CutH : centerThickness + support.H;
            let topY = i === 0 || i === supportNum - 1 ? end.SlabH + common.PavementT : centerThickness;
            let lflange = [[], [], []];
            let uflange = [[], [], []];
            let lWeb = GenGirderRestPoint(GenWebPoint(lwb, lwt, 0, -bottomY), GenWebPoint(lwb, lwt, gradient, -topY), 0, gradient, -commonThickness);
            let rWeb = GenGirderRestPoint(GenWebPoint(rwb, rwt, 0, -bottomY), GenWebPoint(rwb, rwt, gradient, -topY), 0, gradient, commonThickness);
            if ((i === 0 || i === supportNum - 1) && !end.Box) {
                if (end.LF < sectionInfo.B / 2) {
                    lflange[0] = GenGirderRestPoint(
                        { x: lwb.x - (commonThickness / 2 + end.LF / 2), y: -bottomY },
                        { x: lwb.x + (end.LF / 2 - commonThickness / 2), y: -bottomY },
                        null,
                        null,
                        -commonThickness
                    );
                    lflange[1] = GenGirderRestPoint(
                        { x: rwb.x + (commonThickness / 2 + end.LF / 2), y: -bottomY },
                        { x: rwb.x - (end.LF / 2 - commonThickness / 2), y: -bottomY },
                        null,
                        null,
                        -commonThickness
                    );
                } else {
                    lflange[2] = GenGirderRestPoint({ x: -end.LF / 2, y: -bottomY }, { x: end.LF / 2, y: -bottomY }, null, null, -commonThickness);
                }
                let uf1 = {
                    x: lWeb[1].x - (commonThickness / 2 + end.UF / 2),
                    y: lWeb[1].y - gradient * (commonThickness / 2 + end.UF / 2),
                };
                let uf2 = {
                    x: lWeb[1].x + (end.UF / 2 - commonThickness / 2),
                    y: lWeb[1].y + gradient * (end.UF / 2 - commonThickness / 2),
                };
                let uf3 = {
                    x: rWeb[1].x + (commonThickness / 2 + end.UF / 2),
                    y: rWeb[1].y + gradient * (commonThickness / 2 + end.UF / 2),
                };
                let uf4 = {
                    x: rWeb[1].x - (end.UF / 2 - commonThickness / 2),
                    y: rWeb[1].y - gradient * (end.UF / 2 - commonThickness / 2),
                };
                uflange[0] = [
                    uf1,
                    uf2,
                    { x: uf2.x - sin * commonThickness, y: uf2.y + cos * commonThickness },
                    { x: uf1.x - sin * commonThickness, y: uf1.y + cos * commonThickness },
                ];
                uflange[1] = [
                    uf4,
                    uf3,
                    { x: uf3.x - sin * commonThickness, y: uf3.y + cos * commonThickness },
                    { x: uf4.x - sin * commonThickness, y: uf4.y + cos * commonThickness },
                ];
            } else {
                let uf1 = { x: -(support.UF / 2), y: -topY - gradient * (support.UF / 2) };
                let uf2 = { x: support.UF / 2, y: -topY + gradient * (support.UF / 2) };
                lflange[2] = GenGirderRestPoint(
                    { x: -support.LF / 2, y: -bottomY },
                    { x: support.LF / 2, y: -bottomY },
                    null,
                    null,
                    -commonThickness
                );
                uflange[2] = [
                    uf1,
                    uf2,
                    { x: uf2.x - sin * commonThickness, y: uf2.y + cos * commonThickness },
                    { x: uf1.x - sin * commonThickness, y: uf1.y + cos * commonThickness },
                ];
            }
            sectionPoints[i].push({
                point,
                LRib: [],
                URib: [],
                uflange,
                lflange,
                web: [lWeb, rWeb],
            });
        }
    }
    const hr = 3; //헌치 기울기 추후 외부입력변수로 변경
    for (let i = 0; i < supportNum; i++) {
        let name = "CRS" + (i + 1).toFixed(0);
        let deckPoint = girderLayout.gridKeyPoint[name];
        let deckLpt = IntersectionPointOnSpline(lLine, deckPoint, alignment);
        let deckRpt = IntersectionPointOnSpline(rLine, deckPoint, alignment);
        let uflangePoint = [];
        let sH = i === 0 || i === supportNum - 1 ? end.SlabH + common.PavementT : support.SlabH + common.PavementT;
        let endH = i === 0 || i === supportNum - 1 ? end.SlabEndH + common.PavementT : support.SlabEndH + common.PavementT;
        for (let j = 0; j < girderNumber; j++) {
            let ptName = "G" + (j + 1).toFixed(0) + "S" + (i + 1).toFixed(0);
            let point = sectionPoints[i][j].point;
            let deltaZ = point.z - deckPoint.z;
            let deltaX = point.offset;
            let gradient = common.isFlat ? 0 : point.gradientY;
            let haunchH = i === 0 || i === supportNum - 1 ? 0 : support.HaunchH;
            for (let k in sectionPoints[i][j]["uflange"]) {
                if (sectionPoints[i][j]["uflange"][k].length > 0) {
                    let pt1 = sectionPoints[i][j].uflange[k][0];
                    let pt2 = sectionPoints[i][j].uflange[k][1];
                    let hh1 = haunchH === 0 ? 0 : Math.abs(haunchH + (-gradient + point.gradientY) * (pt1.x - support.HaunchW));
                    let hh2 = haunchH === 0 ? 0 : Math.abs(haunchH + (-gradient + point.gradientY) * (pt2.x + support.HaunchW));
                    if (haunchH === 0) {
                        uflangePoint.push({ x: deltaX + pt1.x, y: deltaZ + pt1.y });
                        uflangePoint.push({ x: deltaX + pt1.x, y: deltaZ + pt1.y });
                        uflangePoint.push({ x: deltaX + pt2.x, y: deltaZ + pt2.y });
                        uflangePoint.push({ x: deltaX + pt2.x, y: deltaZ + pt2.y });
                    } else {
                        uflangePoint.push({
                            x: deltaX + pt1.x - support.HaunchW - hh1 * hr,
                            y: deltaZ - sH + point.gradientY * (pt1.x - support.HaunchW - hh1 * hr),
                        });
                        uflangePoint.push({
                            x: deltaX + pt1.x - support.HaunchW,
                            y: deltaZ + pt1.y - gradient * support.HaunchW,
                        });
                        uflangePoint.push({
                            x: deltaX + pt2.x + support.HaunchW,
                            y: deltaZ + pt2.y + gradient * support.HaunchW,
                        });
                        uflangePoint.push({
                            x: deltaX + pt2.x + support.HaunchW + hh2 * hr,
                            y: deltaZ - sH + point.gradientY * (pt2.x + support.HaunchW + hh2 * hr),
                        });
                    }
                }
            }
        }
        uflangePoint.pop();
        uflangePoint.shift();
        deckPointDicts.push({
            mp: deckPoint,
            points: [
                { x: deckLpt.offset, y: deckLpt.z - deckPoint.z - endH },
                { x: deckLpt.offset, y: deckLpt.z - deckPoint.z - common.PavementT },
                { x: 0, y: -common.PavementT },
                { x: deckRpt.offset, y: deckRpt.z - deckPoint.z - common.PavementT },
                { x: deckRpt.offset, y: deckRpt.z - deckPoint.z - endH },
                ...uflangePoint.reverse(),
            ],
        });
    }

    let mainPartDefaultInfo = GenDefaultMainPartData(girderLayout, basicSectionInfo, seShape);
    let spSectionDrawing = GenSupportSectionDrawing(deckPointDicts, sectionPoints, properties);
    let endSideDrawing = GenEndSideDrawing(seShape, end, properties);
    let drawing = [...spSectionDrawing, ...endSideDrawing];

    let result = {
        seShape,
        drawing,
        mainPartDefaultInfo,
        // spSectionDrawing,
    };

    return result;
}

export function GenSectionPointDictFn(girderBaseInfo, gridPointDict, gridInput) {
    let result = {};
    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    const sectionInfo = {
        B: girderBaseInfo.common.B,
        H: girderBaseInfo.common.H ? girderBaseInfo.common.H : girderBaseInfo.end.H,
        UL: girderBaseInfo.common.T ? girderBaseInfo.common.T / 2 : girderBaseInfo.common.B / 2,
        UR: girderBaseInfo.common.T ? girderBaseInfo.common.T / 2 : girderBaseInfo.common.B / 2,
    };

    for (let k in gridPointDict) {
        if (k.substr(0, 1) === "G") {
            let point = gridPointDict[k];
            let girderIndex = k.substr(1, 1) - 1;
            let baseInput = {};
            let station = point.mainStation;
            let isFlat = girderBaseInfo.common.isFlat;
            let gradient = isFlat ? 0 : point.gradientY;
            let skew = point.skew;
            let pointSectionInfo = GetPointSectionInfo(station, skew, gridInput, girderIndex, gridPointDict);

            const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
            const lwb = { x: -sectionInfo.B / 2, y: -sectionInfo.H - centerThickness, z: 0 };
            const lwt = { x: -sectionInfo.UL, y: -centerThickness, z: 0 };
            const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness, z: 0 };
            const rwt = { x: sectionInfo.UR, y: -centerThickness, z: 0 };

            let forward = {};
            let backward = {};
            let ps = {};
            for (let i = 0; i < 2; i++) {
                if (i === 0) {
                    ps = pointSectionInfo.forward;
                } else {
                    ps = pointSectionInfo.backward;
                }

                let bottomY = ps.height + centerThickness;
                let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
                let LRib = [];
                for (let j in ps.lRibLO) {
                    let lRib = [
                        { x: ps.lRibLO[j] - ps.lRibThk / 2, y: -bottomY, z: 0 },
                        { x: ps.lRibLO[j] - ps.lRibThk / 2, y: -bottomY + ps.lRibH, z: 0 },
                        { x: ps.lRibLO[j] + ps.lRibThk / 2, y: -bottomY + ps.lRibH, z: 0 },
                        { x: ps.lRibLO[j] + ps.lRibThk / 2, y: -bottomY, z: 0 },
                    ];
                    LRib.push(lRib);
                }

                let URib = [];
                for (let j in ps.uRibLO) {
                    let uRib = [
                        { x: ps.uRibLO[j] - ps.uRibThk / 2, y: -topY + (ps.uRibLO[j] - ps.uRibThk / 2) * gradient, z: 0 },
                        { x: ps.uRibLO[j] - ps.uRibThk / 2, y: -topY - ps.uRibH + ps.uRibLO[j] * gradient, z: 0 },
                        { x: ps.uRibLO[j] + ps.uRibThk / 2, y: -topY - ps.uRibH + ps.uRibLO[j] * gradient, z: 0 },
                        { x: ps.uRibLO[j] + ps.uRibThk / 2, y: -topY + (ps.uRibLO[j] + ps.uRibThk / 2) * gradient, z: 0 },
                    ];
                    URib.push(uRib);
                }

                // leftWeb
                let lw1 = GenWebPoint(lwb, lwt, 0, -bottomY); //{x:blwX,y:-height}
                let lw2 = GenWebPoint(lwb, lwt, gradient, -topY); //{x:tlwX,y:gradient*tlwX - slabThickness}
                let lWeb = GenGirderRestPoint(lw1, lw2, 0, gradient, -ps.webThk);

                // rightWeb
                let rw1 = GenWebPoint(rwb, rwt, 0, -bottomY); //{x:brwX,y:-height}
                let rw2 = GenWebPoint(rwb, rwt, gradient, -topY); //{x:trwX,y:gradient*trwX - slabThickness}
                let rWeb = GenGirderRestPoint(rw1, rw2, 0, gradient, ps.webThk);
                // bottomplate
                let lflange = [[], [], []];
                let newbl1 = { x: lw1.x - ps.lFlangeC, y: -bottomY };
                let newbl2 = { x: lw1.x - ps.lFlangeC + ps.lFlangeW, y: -bottomY };
                let newbr1 = { x: rw1.x + ps.lFlangeC, y: -bottomY };
                let newbr2 = { x: rw1.x + ps.lFlangeC - ps.lFlangeW, y: -bottomY };
                if (newbl2.x < newbr2.x) {
                    //양측의 플렌지가 서로 중첩될 경우
                    lflange[0] = GenGirderRestPoint(newbl1, newbl2, null, null, -ps.lFlangeThk); //gradient가 0인 경우, inf에 대한 예외처리 필요
                    lflange[1] = GenGirderRestPoint(newbr1, newbr2, null, null, -ps.lFlangeThk);
                } else {
                    lflange[2] = GenGirderRestPoint(newbl1, newbr1, null, null, -ps.lFlangeThk);
                }
                //topPlate
                // let tan = gradient === 0 ? null : -1 / gradient;
                let rad = Math.atan(gradient);
                let cos = Math.cos(rad);
                let sin = Math.sin(rad);
                let uflange = [[], [], []];
                let newtl1 = { x: lw2.x - ps.uFlangeC, y: lw2.y + gradient * -ps.uFlangeC };
                let newtl2 = {
                    x: lw2.x - ps.uFlangeC + ps.uFlangeW,
                    y: lw2.y + gradient * (-ps.uFlangeC + ps.uFlangeW),
                };
                let newtr1 = { x: rw2.x + ps.uFlangeC, y: rw2.y + gradient * ps.uFlangeC };
                let newtr2 = {
                    x: rw2.x + ps.uFlangeC - ps.uFlangeW,
                    y: rw2.y + gradient * (ps.uFlangeC - ps.uFlangeW),
                };

                if (newtl2.x < newtr2.x) {
                    //양측의 플렌지가 서로 중첩될 경우
                    uflange[0] = [
                        newtl1,
                        newtl2,
                        { x: newtl2.x - sin * ps.uFlangeThk, y: newtl2.y + cos * ps.uFlangeThk },
                        { x: newtl1.x - sin * ps.uFlangeThk, y: newtl1.y + cos * ps.uFlangeThk },
                    ];
                    uflange[1] = [
                        newtr1,
                        newtr2,
                        { x: newtr2.x - sin * ps.uFlangeThk, y: newtr2.y + cos * ps.uFlangeThk },
                        { x: newtr1.x - sin * ps.uFlangeThk, y: newtr1.y + cos * ps.uFlangeThk },
                    ];
                } else {
                    uflange[2] = [
                        newtl1,
                        newtr1,
                        { x: newtr1.x - sin * ps.uFlangeThk, y: newtr1.y + cos * ps.uFlangeThk },
                        { x: newtl1.x - sin * ps.uFlangeThk, y: newtl1.y + cos * ps.uFlangeThk },
                    ];
                }
                let uflangeSide = [-topY, -topY + ps.uFlangeThk];
                let lflangeSide = [-bottomY, -bottomY - ps.lFlangeThk];
                let webSide = [-bottomY, -topY];
                // 하부콘크리트는 항상 있는게 아니기 때문에 다른 부재와는 구분이 되어야 할듯함. 21.01.18 by drlim
                let lConc = [];
                let lConcSide = [];
                if (ps.lConcThk > 0) {
                    lConc.push(
                        GenWebPoint(lwb, lwt, 0, -bottomY),
                        GenWebPoint(lwb, lwt, 0, -bottomY + ps.lConcThk),
                        GenWebPoint(rwb, rwt, 0, -bottomY + ps.lConcThk),
                        GenWebPoint(rwb, rwt, 0, -bottomY)
                    );
                    lConcSide.push(-bottomY, -bottomY + ps.lConcThk);
                }
                baseInput = {
                    isDoubleComposite: false, // 추후 PointSectionInfo에 관련 변수 추가
                    isClosedTop: newtl2.x < newtr2.x ? false : true, //상부플랜지 분리여부, 비분리시 참
                    isSeparated: newbl2.x < newbr2.x ? true : false, //하부플랜지 분리여부, 분리시 참
                    B1: rw1.x - lw1.x, //강거더 하부 내부폭
                    B2: rw2.x - lw2.x, //강거더 상부 내부폭
                    B3: 3500, //바닥판 콘크리트 폭                      //슬래브에 대한 정보는 외부에서 받아와야 함
                    wlw: TwoPointsLength(lw1, lw2), //좌측웹 폭
                    wrw: TwoPointsLength(rw1, rw2), //우측웹 폭
                    wuf: newtl2.x < newtr2.x ? Math.min(ps.uFlangeW, ps.uFlangeC * 2 - ps.webThk) : newtr1.x - newtl1.x, //상부플랜지 폭
                    wlf: newbl2.x < newbr2.x ? Math.min(ps.lFlangeW, ps.lFlangeC * 2 - ps.webThk) : newbr1.x - newbl1.x, //하부플랜지
                    gradient: gradient, //상부플랜지 기울기
                    gradientlf: ps.lFlangeGradient,
                    H: bottomY - topY, //강거더 높이
                    tlf: ps.lFlangeThk, //하부플랜지 두께
                    tuf: ps.uFlangeThk, //상부플랜지두께
                    tw: ps.webThk, //웹두께
                    Tcu: ps.slabThickness, //바닥판콘크리트 두께
                    Th: ps.haunchH, //헌치두께
                    Tcl: ps.lConcThk, //지점콘크리트 두께     //지점콘크리트에 대한 입력 변수 추가
                    blf: ps.lFlangeC, //하부플랜지 외부폭
                    buf: ps.uFlangeC, //상부플랜지 외부폭
                    Urib: { thickness: ps.uRibThk, height: ps.uRibH, layout: ps.uRibLO },
                    Lrib: { thickness: ps.lRibThk, height: ps.lRibH, layout: ps.lRibLO },
                    horizontal_bracing: { d0: 2500, vbArea: 50, dbArea: 50 }, //수직보강재 간격, 수평브레이싱 수직, 사재 단면적
                };
                if (i === 0) {
                    forward = {
                        input: baseInput,
                        skew,
                        LRib,
                        URib,
                        uflange,
                        lflange,
                        web: [lWeb, rWeb],
                        uflangeSide,
                        lflangeSide,
                        webSide,
                        lConc,
                        lConcSide,
                    };
                } else {
                    backward = {
                        input: baseInput,
                        skew,
                        LRib,
                        URib,
                        uflange,
                        lflange,
                        web: [lWeb, rWeb],
                        uflangeSide,
                        lflangeSide,
                        webSide,
                        lConc,
                        lConcSide,
                    };
                }
            }
            result[k] = { forward, backward };
        }
    }
    return result;
}

export function GenDefaultETCPartDataFn(girderStation, sectionPointDict) {
    let jackupLayout = GenDefaultJackup(girderStation, sectionPointDict);
    let studLayout = GenDefaultStud(girderStation, sectionPointDict);
    let supportLayout = GenDefaultSupport(girderStation, sectionPointDict);
    let hStiffLayout = GenDefaultHStiffner(girderStation, sectionPointDict);
    return { jackupLayout, studLayout, supportLayout, hStiffLayout };
}

function GenSupportSectionDrawing(deckPointDicts, sectionPoints, properties) {
    let result = [];
    const fontSize = 14;
    const layer = "DIM";
    let paperScale = properties ? properties.scale : 1;
    let ps = paperSize[properties.size];
    let xList = [];
    for (let k in deckPointDicts[0].points) {
        xList.push(deckPointDicts[0].points[k].x);
    }
    let pxOffset = ps.x * paperScale;
    let pyOffset = ps.y * paperScale;
    let girderNum = sectionPoints[0].length; //girderStation.length
    let spanNum = deckPointDicts.length; //deck.length

    //
    let slabWidth = Math.max(...xList) - Math.min(...xList);
    let mx = Math.floor(pxOffset / (slabWidth + 4000));
    let my = 2;
    let drawIndex = Math.ceil(spanNum / mx / my);

    for (let j = 0; j < spanNum; j++) {
        let section = { draw: [], dim: [], tag: [] };
        let webDim = [];
        let heightDim = [];

        for (let i = 0; i < girderNum; i++) {
            let girderPoint = sectionPoints[j][i]["point"];
            let deltaZ = girderPoint.z - deckPointDicts[j].mp.z;
            let offset = girderPoint.offset;
            let sectionPoint = sectionPoints[j][i];
            for (let key in sectionPoint) {
                if (key === "uflange" || key === "lflange" || key === "web" || key === "URib" || key === "LRib") {
                    for (let k in sectionPoint[key]) {
                        if (sectionPoint[key][k].length > 0) {
                            let pts = [];
                            sectionPoint[key][k].forEach(pt => pts.push({ x: pt.x + offset, y: pt.y + deltaZ }));
                            section["draw"].push(new Line(pts, "CYAN", true, null, { name: "Support", part: key }));
                            if (key === "web") {
                                webDim.push(pts[1]);
                                heightDim = [pts[0], pts[1]];
                                section["dim"].push(
                                    ToDimAlign(heightDim, fontSize, layer, false, false, 0, 0, 1, {
                                        name: "Support",
                                        part: "dimension",
                                    })
                                );
                                // 각 거더별 형고를 표현해야 하는데, 웹의 높이 출력
                            }
                        }
                    }
                }
            }
        }

        let xOffset = ((j % mx) + 0.5) * (pxOffset / mx) + Math.floor(j / mx / my) * pxOffset;
        let yOffset = 0.7 * pyOffset - 1 * (Math.floor(j / mx) % my) * 0.4 * pyOffset;
        let deckPt = deckPointDicts[j].points; //[];
        let dimIndex = deckPt[1].y > deckPt[3].y ? true : false;
        section["draw"].push(new Line(deckPt, "GREEN", true, null, { name: "Support", part: "deck" }));

        section["dim"].push(
            ToDimAlign([deckPt[1], ...webDim, deckPt[3]], 0, "DIM", true, true, 0, dimIndex ? 0 : webDim.length + 1, 1, {
                name: "Support",
                part: "dimension",
            }),
            ToDimAlign([deckPt[1], deckPt[2], deckPt[3]], 0, "DIM", true, true, 0, dimIndex ? 0 : 2, 2, {
                name: "Support",
                part: "dimension",
            }),
            ToDimAlign([deckPt[1], deckPt[3]], 0, "DIM", true, true, 0, dimIndex ? 0 : 1, 3, {
                name: "Support",
                part: "dimension",
            }),
            ToDimAlign([deckPt[0], deckPt[1]], 0, "DIM", false, true, 0, 0, 1, {
                name: "Support",
                part: "dimension",
            })
        );
        result.push(
            ...Layout2D(section["draw"], section["dim"], [], xOffset, yOffset, paperScale, 1, "횡단면도 - S" + (j + 1).toFixed(), "", 20, 0, false)
        );
        let multiPlot = [{ yOffset: 0, num: drawIndex, title: "교량단면 요약도" }];
        result.push(...Plot2D(properties, multiPlot));
    }
    return result;
}

function GenEndSideDrawing(seShape, endSection, properties) {
    let result = [];
    let paperScale = properties ? properties.scale : 1;
    let ps = paperSize[properties.size];
    let pxOffset = ps.x * paperScale;
    let pyOffset = ps.y * paperScale;
    let xOffset = pxOffset * 0.5;
    let yOffset = -1 * pyOffset * 0.3;

    for (let k = 0; k < 2; k++) {
        let side = { draw: [], dim: [], tag: [] };
        let shape = k === 0 ? seShape.start : seShape.end;
        let sn = k === 0 ? 1 : -1;
        let Xi = k === 0 ? 0 : shape.A + shape.D + shape.F + shape.G + 2000;
        let title = k === 0 ? "시점부-측면도" : "종점부-측면도";
        let sAbut = [
            { x: Xi + sn * -200, y: 0 },
            { x: Xi, y: 0 },
            { x: Xi, y: -shape.endSlabH - endSection.H + endSection.CutH },
        ];
        let sDeck = [
            //헌치두께까지 더해야할듯함.
            { x: Xi + sn * (shape.A + shape.D + shape.F + shape.G + 2000), y: -shape.slabH },
            { x: Xi + sn * (shape.A + shape.D + shape.F + shape.G), y: -shape.slabH },
            { x: Xi + sn * (shape.A + shape.D + shape.F), y: -shape.endSlabH },
            { x: Xi + sn * (shape.A + shape.D), y: -shape.endSlabH },
            { x: Xi + sn * shape.A, y: -shape.endSlabH },
            { x: Xi + sn * shape.A, y: 0 },
            { x: Xi + sn * (shape.A + shape.D), y: 0 },
            { x: Xi + sn * (shape.A + shape.D + shape.F), y: 0 },
            { x: Xi + sn * (shape.A + shape.D + shape.F + shape.G), y: 0 },
            { x: Xi + sn * (shape.A + shape.D + shape.F + shape.G + 2000), y: 0 },
        ];
        let sWeb = [
            { x: Xi + sn * (shape.A + shape.D), y: -shape.endSlabH },
            { x: Xi + sn * (shape.A + shape.D), y: -shape.endSlabH - endSection.H + endSection.CutH },
            { x: Xi + sn * (shape.A + shape.D + endSection.CutL), y: -shape.endSlabH - endSection.H + endSection.CutH },
            { x: Xi + sn * (shape.A + shape.D + endSection.CutL), y: -shape.endSlabH - endSection.H },
            { x: Xi + sn * (shape.A + shape.D + shape.F + shape.G + 2000), y: -shape.endSlabH - endSection.H },
        ];

        side["draw"].push(new Line(sDeck, "GREEN", false, null, { name: "End-Side", part: "deck" }));
        side["draw"].push(new Line(sAbut, "GREEN", false, null, { name: "End-Side", part: "abutment" }));
        let isClockwise = k === 0 ? true : false;
        side["draw"].push(
            new Line([sWeb[0], ...GetPointsWithBulge([sWeb[1], sWeb[2], sWeb[3]], 100, isClockwise), sWeb[4]], "CYAN", false, null, {
                name: "End-Side",
                part: "web",
            })
        );

        let isTop = k === 0 ? true : false;
        side["dim"].push(
            ToDimAlign([sAbut[1], sDeck[5], sDeck[6], sDeck[7], sDeck[8]], 0, "DIM", true, true, 0, 1, 1, {
                name: "End-Side",
                part: "dimension",
            }),
            ToDimAlign([sDeck[7], sDeck[2], sWeb[3]], 0, "DIM", false, isTop, 0, 0, 1, {
                name: "End-Side",
                part: "dimension",
            }),
            ToDimAlign([sDeck[8], sDeck[1], sWeb[3]], 0, "DIM", false, isTop, 0, 1, 1, {
                name: "End-Side",
                part: "dimension",
            })
        );

        result.push(...Layout2D(side["draw"], side["dim"], [], xOffset, yOffset - pyOffset * k * 0.3, paperScale, 2, title, "", 15, 0, true));
    }
    let multiPlot = [{ yOffset: -1 * pyOffset, num: 1, title: "시종점부 요약도" }];
    result.push(...Plot2D(properties, multiPlot));

    return result;
}

function GenDefaultMainPartData(girderLayout, basicSectionInfo, seShape) {
    let end = basicSectionInfo.end;
    let support = basicSectionInfo.support;
    let common = basicSectionInfo.common;
    let auto = basicSectionInfo.auto;
    let Height = GenDefaultGirderHeight(girderLayout, end, support, common, seShape);
    let flange = GenDefaultFlange(girderLayout, end, support, common, auto);
    let joint = GenDefaultFactoryJoint(girderLayout, common);
    let stiff = GenDefaultStiffPoint(girderLayout, end, support, auto, seShape);
    // slabLayout = [구간명, 슬래브두께, 켄틸레버슬래브두께,  ]
    let slabLayout = [
        ["CRK0", end.SlabH, end.SlabEndH, -1 * common.SlabLeft, common.SlabRight, 0],
        ["CRK2", end.SlabH, end.SlabEndH, -1 * common.SlabLeft, common.SlabRight, 0],
        ["CRK3", support.SlabH, support.SlabEndH, -1 * common.SlabLeft, common.SlabRight, basicSectionInfo.support.HaunchH],
        ["CRK4", support.SlabH, support.SlabEndH, -1 * common.SlabLeft, common.SlabRight, basicSectionInfo.support.HaunchH],
        ["CRK5", end.SlabH, end.SlabEndH, -1 * common.SlabLeft, common.SlabRight, 0],
        ["CRK7", end.SlabH, end.SlabEndH, -1 * common.SlabLeft, common.SlabRight, 0],
    ];

    return {
        range: {
            H: Height.hLayout,
            TW: flange.ufwLayout,
            BW: flange.lfwLayout,
            TF: joint.TFLayout,
            BF: joint.BFLayout,
            WF: joint.WFLayout,
            TR: flange.uRib,
            BR: flange.lRib,
            LC: stiff.lConcLayout,
        },
        point: { D: stiff.diaLayout, V: stiff.vStiffLayout, SP: stiff.SpliceLayout },
        slabLayout,
        xbeamLayout: stiff.xbeamLayout,
    }; //종리브와 같은 불연속한 부재에 대한 내용 추가필요
}

function GenDefaultGirderHeight(girderLayout, endSection, supportSection, auto, SEShape) {
    let girderNum = girderLayout.girderCount;
    let supportNum = girderLayout.supportCount;
    let supportData = girderLayout.input.supports;
    let hLayout = [];
    let diaSpacing = auto.diaSpacing; //공통변수로부터 입력
    let c0 = 15000 * 2; //공통변수로부터 입력 auto.HeightTaperStart
    let c1 = 1250 * 2; //공통변수로부터 입력 auto.HeightTaperEnd
    let c2 = 0;
    for (let i = 0; i < girderNum; i++) {
        let hSub = [];
        for (let j = 1; j < supportNum - 1; j++) {
            let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + j.toFixed(0);
            if (j === 1) {
                if (endSection.CutL * endSection.CutH > 0) {
                    c2 = endSection.CutL - (supportData[j][1] - SEShape.start.A + SEShape.start.D);
                    hSub.push([benchMarkName, c2, endSection.H - endSection.CutH, endSection.H - endSection.CutH, "straight"]);
                }
            } else if (j > 1 && j < supportNum - 2) {
                hSub.push([benchMarkName, -c0, endSection.H, endSection.H, "straight"]);
                hSub.push([benchMarkName, -c1, endSection.H, supportSection.H, "circle"]);
                hSub.push([benchMarkName, c1, supportSection.H, supportSection.H, "straight"]);
                hSub.push([benchMarkName, c0, supportSection.H, endSection.H, "circle"]);
            } else if (j === supportNum - 2) {
                if (endSection.CutL * endSection.CutH > 0) {
                    c2 = endSection.CutL - (supportData[j + 1][1] - SEShape.end.A + SEShape.end.D);
                    hSub.push([benchMarkName, -c2, endSection.H, endSection.H, "straight"]);
                    hSub.push(["end", 0, endSection.H - endSection.CutH, endSection.H - endSection.CutH, "straight"]);
                } else {
                    hSub.push(["end", 0, endSection.H, endSection.H, "straight"]);
                }
            }
        }
        hLayout.push(hSub);
    }
    return { hLayout };
}

function GenDefaultFlange(girderLayout, endSection, supportSection, common, auto) {
    let girderNum = girderLayout.girderCount;
    let supportNum = girderLayout.supportCount;
    let webThickness = 12; //추후 외부에서 받아와야할듯함
    let RibHeight = 150;
    let bottomRibHeight = 220;
    let RibThickness = 14;
    let bottomRibThickness = 22;
    let diaSpacing = auto.diaSpacing; //공통변수
    let boxLength = diaSpacing * 2; //공통변수로부터
    let taperLength = diaSpacing / 2; //공통변수로부터
    let taperWidth = 800;
    let taperMargin = 250;
    let ufwLayout = [];
    let lfwLayout = [];
    let uRib = [];
    let lRib = [];
    for (let i = 0; i < girderNum; i++) {
        let ufSub = [];
        let lfSub = [];
        let uRibSub = [];
        let lRibSub = [];
        for (let j = 1; j < supportNum - 1; j++) {
            let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + j.toFixed(0);
            if (j === 1) {
                if (endSection.Box) {
                    ufSub.push([
                        benchMarkName,
                        boxLength / 2,
                        supportSection.UF,
                        supportSection.UF,
                        supportSection.UF / 2 - common.B / 2,
                        supportSection.UF / 2 - common.B / 2,
                    ]);
                    lfSub.push([
                        benchMarkName,
                        boxLength / 2,
                        supportSection.LF,
                        supportSection.LF,
                        supportSection.LF / 2 - common.B / 2,
                        supportSection.LF / 2 - common.B / 2,
                    ]);

                    ufSub.push([
                        benchMarkName,
                        boxLength / 2 + taperMargin,
                        supportSection.UF,
                        supportSection.UF,
                        endSection.UF / 2 - common.B / 2,
                        endSection.UF / 2 - common.B / 2,
                    ]);
                    lfSub.push([
                        benchMarkName,
                        boxLength / 2 + taperMargin,
                        supportSection.LF,
                        supportSection.LF,
                        endSection.LF / 2 - common.B / 2,
                        endSection.LF / 2 - common.B / 2,
                    ]);

                    ufSub.push([
                        benchMarkName,
                        boxLength / 2 + taperLength,
                        endSection.UF,
                        endSection.UF,
                        endSection.UF / 2 - common.B / 2,
                        endSection.UF / 2 - common.B / 2,
                    ]);
                    lfSub.push([
                        benchMarkName,
                        boxLength / 2 + taperLength,
                        endSection.LF,
                        endSection.LF,
                        endSection.LF / 2 - common.B / 2,
                        endSection.LF / 2 - common.B / 2,
                    ]);
                    uRibSub.push([benchMarkName, +boxLength / 2 + taperMargin, RibThickness, RibHeight, "-400,400"]);
                    lRibSub.push([benchMarkName, +boxLength / 2 + taperMargin, bottomRibThickness, bottomRibHeight, "-400,400"]);
                }
            } else if (j > 1 && j < supportNum - 2) {
                ufSub.push([
                    benchMarkName,
                    -boxLength - taperLength,
                    endSection.UF,
                    endSection.UF,
                    endSection.UF / 2 - common.B / 2,
                    endSection.UF / 2 - common.B / 2,
                ]);
                lfSub.push([
                    benchMarkName,
                    -boxLength - taperLength,
                    endSection.LF,
                    endSection.LF,
                    endSection.LF / 2 - common.B / 2,
                    endSection.LF / 2 - common.B / 2,
                ]);

                ufSub.push([
                    benchMarkName,
                    -boxLength - taperMargin,
                    endSection.UF,
                    endSection.UF,
                    endSection.UF / 2 - common.B / 2,
                    endSection.UF / 2 - common.B / 2,
                ]);
                lfSub.push([
                    benchMarkName,
                    -boxLength - taperMargin,
                    endSection.LF,
                    endSection.LF,
                    endSection.LF / 2 - common.B / 2,
                    endSection.LF / 2 - common.B / 2,
                ]);

                ufSub.push([
                    benchMarkName,
                    -boxLength,
                    supportSection.UF,
                    supportSection.UF,
                    endSection.UF / 2 - common.B / 2,
                    endSection.UF / 2 - common.B / 2,
                ]);
                lfSub.push([
                    benchMarkName,
                    -boxLength,
                    supportSection.LF,
                    supportSection.LF,
                    endSection.LF / 2 - common.B / 2,
                    endSection.LF / 2 - common.B / 2,
                ]);

                ufSub.push([
                    benchMarkName,
                    boxLength,
                    supportSection.UF,
                    supportSection.UF,
                    supportSection.UF / 2 - common.B / 2,
                    supportSection.UF / 2 - common.B / 2,
                ]);
                lfSub.push([
                    benchMarkName,
                    boxLength,
                    supportSection.LF,
                    supportSection.LF,
                    supportSection.LF / 2 - common.B / 2,
                    supportSection.LF / 2 - common.B / 2,
                ]);

                ufSub.push([
                    benchMarkName,
                    boxLength + taperMargin,
                    supportSection.UF,
                    supportSection.UF,
                    endSection.UF / 2 - common.B / 2,
                    endSection.UF / 2 - common.B / 2,
                ]);
                lfSub.push([
                    benchMarkName,
                    boxLength + taperMargin,
                    supportSection.LF,
                    supportSection.LF,
                    endSection.UF / 2 - common.B / 2,
                    endSection.LF / 2 - common.B / 2,
                ]);

                ufSub.push([
                    benchMarkName,
                    boxLength + taperLength,
                    endSection.UF,
                    endSection.UF,
                    endSection.UF / 2 - common.B / 2,
                    endSection.UF / 2 - common.B / 2,
                ]);
                lfSub.push([
                    benchMarkName,
                    boxLength + taperLength,
                    endSection.LF,
                    endSection.LF,
                    endSection.LF / 2 - common.B / 2,
                    endSection.LF / 2 - common.B / 2,
                ]);

                uRibSub.push([benchMarkName, -boxLength - taperMargin, 0, 0, ""]);
                uRibSub.push([benchMarkName, +boxLength + taperMargin, RibThickness, RibHeight, "-400,400"]);
                lRibSub.push([benchMarkName, -boxLength - taperMargin, 0, 0, ""]);
                lRibSub.push([benchMarkName, +boxLength + taperMargin, bottomRibThickness, bottomRibHeight, "-400,400"]);
            } else if (j === supportNum - 2) {
                if (endSection.Box) {
                    ufSub.push([
                        benchMarkName,
                        -boxLength / 2 - taperLength,
                        endSection.UF,
                        endSection.UF,
                        endSection.UF / 2 - common.B / 2,
                        endSection.UF / 2 - common.B / 2,
                    ]);
                    lfSub.push([
                        benchMarkName,
                        -boxLength / 2 - taperLength,
                        endSection.LF,
                        endSection.LF,
                        endSection.LF / 2 - common.B / 2,
                        endSection.LF / 2 - common.B / 2,
                    ]);

                    ufSub.push([
                        benchMarkName,
                        -boxLength / 2 - taperMargin,
                        endSection.UF,
                        endSection.UF,
                        endSection.UF / 2 - common.B / 2,
                        endSection.UF / 2 - common.B / 2,
                    ]);
                    lfSub.push([
                        benchMarkName,
                        -boxLength / 2 - taperMargin,
                        endSection.LF,
                        endSection.LF,
                        endSection.LF / 2 - common.B / 2,
                        endSection.LF / 2 - common.B / 2,
                    ]);

                    ufSub.push([
                        benchMarkName,
                        -boxLength / 2,
                        supportSection.UF,
                        supportSection.UF,
                        endSection.UF / 2 - common.B / 2,
                        endSection.UF / 2 - common.B / 2,
                    ]);
                    lfSub.push([
                        benchMarkName,
                        -boxLength / 2,
                        supportSection.LF,
                        supportSection.LF,
                        endSection.LF / 2 - common.B / 2,
                        endSection.LF / 2 - common.B / 2,
                    ]);

                    ufSub.push([
                        "end",
                        0,
                        supportSection.UF,
                        supportSection.UF,
                        supportSection.UF / 2 - common.B / 2,
                        supportSection.UF / 2 - common.B / 2,
                    ]);
                    lfSub.push([
                        "end",
                        0,
                        supportSection.LF,
                        supportSection.LF,
                        supportSection.LF / 2 - common.B / 2,
                        supportSection.LF / 2 - common.B / 2,
                    ]);

                    uRibSub.push([benchMarkName, -boxLength / 2 - taperMargin, 0, 0, ""]);
                    lRibSub.push([benchMarkName, -boxLength / 2 - taperMargin, 0, 0, ""]);
                    uRibSub.push(["end", 0, RibThickness, RibHeight, "-400,400"]);
                    lRibSub.push(["end", 0, bottomRibThickness, bottomRibHeight, "-400,400"]);
                } else {
                    ufSub.push(["end", 0, endSection.UF, endSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
                    lfSub.push(["end", 0, endSection.LF, endSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);
                    uRibSub.push(["end", 0, 0, 0, ""]);
                    lRibSub.push(["end", 0, 0, 0, ""]);
                }
            }
        }
        ufwLayout.push(ufSub);
        lfwLayout.push(lfSub);
        uRib.push(uRibSub);
        lRib.push(lRibSub);
    }
    return { ufwLayout, lfwLayout, uRib, lRib };
}
// function GenDefaultFlange(girderLayout, endSection, supportSection, common, auto) {
//     let girderNum = girderLayout.girderCount;
//     let supportNum = girderLayout.supportCount;
//     let webThickness = 12; //추후 외부에서 받아와야할듯함
//     let RibHeight = 150;
//     let bottomRibHeight = 220;
//     let RibThickness = 14;
//     let bottomRibThickness = 22;
//     let diaSpacing = auto.diaSpacing; //공통변수
//     let boxLength = diaSpacing * 2; //공통변수로부터
//     let taperLength = diaSpacing / 2; //공통변수로부터
//     let taperWidth = 800;
//     let taperMargin = 250;
//     let ufwLayout = [];
//     let lfwLayout = [];
//     let uRib = [];
//     let lRib = [];
//     for (let i = 0; i < girderNum; i++) {
//         let ufSub = [];
//         let lfSub = [];
//         let uRibSub = [];
//         let lRibSub = [];
//         for (let j = 1; j < supportNum - 1; j++) {
//             let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + j.toFixed(0);
//             if (j === 1) {
//                 if (endSection.Box) {
//                     ufSub.push([
//                         benchMarkName,
//                         boxLength / 2,
//                         supportSection.UF,
//                         supportSection.UF,
//                         supportSection.UF / 2 - common.B / 2,
//                         supportSection.UF / 2 - common.B / 2,
//                     ]);
//                     lfSub.push([
//                         benchMarkName,
//                         boxLength / 2,
//                         supportSection.LF,
//                         supportSection.LF,
//                         supportSection.LF / 2 - common.B / 2,
//                         supportSection.LF / 2 - common.B / 2,
//                     ]);

//                     ufSub.push([
//                         benchMarkName,
//                         boxLength / 2 + taperMargin,
//                         supportSection.UF,
//                         supportSection.UF,
//                         endSection.UF / 2 + webThickness / 2,
//                         endSection.UF / 2 + webThickness / 2,
//                     ]);
//                     lfSub.push([
//                         benchMarkName,
//                         boxLength / 2 + taperMargin,
//                         supportSection.LF,
//                         supportSection.LF,
//                         endSection.UF / 2 + webThickness / 2,
//                         endSection.LF / 2 + webThickness / 2,
//                     ]);

//                     ufSub.push([
//                         benchMarkName,
//                         boxLength / 2 + taperLength,
//                         taperWidth,
//                         endSection.UF,
//                         endSection.UF / 2 + webThickness / 2,
//                         endSection.UF / 2 + webThickness / 2,
//                     ]);
//                     lfSub.push([
//                         benchMarkName,
//                         boxLength / 2 + taperLength,
//                         taperWidth,
//                         endSection.LF,
//                         endSection.LF / 2 + webThickness / 2,
//                         endSection.LF / 2 + webThickness / 2,
//                     ]);
//                     uRibSub.push([benchMarkName, +boxLength / 2 + taperMargin, RibThickness, RibHeight, "-400,400"]);
//                     lRibSub.push([benchMarkName, +boxLength / 2 + taperMargin, bottomRibThickness, bottomRibHeight, "-400,400"]);
//                 }
//             } else if (j > 1 && j < supportNum - 2) {
//                 ufSub.push([
//                     benchMarkName,
//                     -boxLength - taperLength,
//                     endSection.UF,
//                     endSection.UF,
//                     endSection.UF / 2 + webThickness / 2,
//                     endSection.UF / 2 + webThickness / 2,
//                 ]);
//                 lfSub.push([
//                     benchMarkName,
//                     -boxLength - taperLength,
//                     endSection.LF,
//                     endSection.LF,
//                     endSection.LF / 2 + webThickness / 2,
//                     endSection.LF / 2 + webThickness / 2,
//                 ]);

//                 ufSub.push([
//                     benchMarkName,
//                     -boxLength - taperMargin,
//                     endSection.UF,
//                     taperWidth,
//                     endSection.UF / 2 + webThickness / 2,
//                     endSection.UF / 2 + webThickness / 2,
//                 ]);
//                 lfSub.push([
//                     benchMarkName,
//                     -boxLength - taperMargin,
//                     endSection.LF,
//                     taperWidth,
//                     endSection.LF / 2 + webThickness / 2,
//                     endSection.LF / 2 + webThickness / 2,
//                 ]);

//                 ufSub.push([
//                     benchMarkName,
//                     -boxLength,
//                     supportSection.UF,
//                     supportSection.UF,
//                     endSection.UF / 2 + webThickness / 2,
//                     endSection.UF / 2 + webThickness / 2,
//                 ]);
//                 lfSub.push([
//                     benchMarkName,
//                     -boxLength,
//                     supportSection.LF,
//                     supportSection.LF,
//                     endSection.LF / 2 + webThickness / 2,
//                     endSection.LF / 2 + webThickness / 2,
//                 ]);

//                 ufSub.push([
//                     benchMarkName,
//                     boxLength,
//                     supportSection.UF,
//                     supportSection.UF,
//                     supportSection.UF / 2 - common.B / 2,
//                     supportSection.UF / 2 - common.B / 2,
//                 ]);
//                 lfSub.push([
//                     benchMarkName,
//                     boxLength,
//                     supportSection.LF,
//                     supportSection.LF,
//                     supportSection.LF / 2 - common.B / 2,
//                     supportSection.LF / 2 - common.B / 2,
//                 ]);

//                 ufSub.push([
//                     benchMarkName,
//                     boxLength + taperMargin,
//                     supportSection.UF,
//                     supportSection.UF,
//                     endSection.UF / 2 + webThickness / 2,
//                     endSection.UF / 2 + webThickness / 2,
//                 ]);
//                 lfSub.push([
//                     benchMarkName,
//                     boxLength + taperMargin,
//                     supportSection.LF,
//                     supportSection.LF,
//                     endSection.UF / 2 + webThickness / 2,
//                     endSection.LF / 2 + webThickness / 2,
//                 ]);

//                 ufSub.push([
//                     benchMarkName,
//                     boxLength + taperLength,
//                     taperWidth,
//                     endSection.UF,
//                     endSection.UF / 2 + webThickness / 2,
//                     endSection.UF / 2 + webThickness / 2,
//                 ]);
//                 lfSub.push([
//                     benchMarkName,
//                     boxLength + taperLength,
//                     taperWidth,
//                     endSection.LF,
//                     endSection.LF / 2 + webThickness / 2,
//                     endSection.LF / 2 + webThickness / 2,
//                 ]);

//                 uRibSub.push([benchMarkName, -boxLength - taperMargin, 0, 0, ""]);
//                 uRibSub.push([benchMarkName, +boxLength + taperMargin, RibThickness, RibHeight, "-400,400"]);
//                 lRibSub.push([benchMarkName, -boxLength - taperMargin, 0, 0, ""]);
//                 lRibSub.push([benchMarkName, +boxLength + taperMargin, bottomRibThickness, bottomRibHeight, "-400,400"]);
//             } else if (j === supportNum - 2) {
//                 if (endSection.Box) {
//                     ufSub.push([
//                         benchMarkName,
//                         -boxLength / 2 - taperLength,
//                         endSection.UF,
//                         endSection.UF,
//                         endSection.UF / 2 + webThickness / 2,
//                         endSection.UF / 2 + webThickness / 2,
//                     ]);
//                     lfSub.push([
//                         benchMarkName,
//                         -boxLength / 2 - taperLength,
//                         endSection.LF,
//                         endSection.LF,
//                         endSection.LF / 2 + webThickness / 2,
//                         endSection.LF / 2 + webThickness / 2,
//                     ]);

//                     ufSub.push([
//                         benchMarkName,
//                         -boxLength / 2 - taperMargin,
//                         endSection.UF,
//                         taperWidth,
//                         endSection.UF / 2 + webThickness / 2,
//                         endSection.UF / 2 + webThickness / 2,
//                     ]);
//                     lfSub.push([
//                         benchMarkName,
//                         -boxLength / 2 - taperMargin,
//                         endSection.LF,
//                         taperWidth,
//                         endSection.LF / 2 + webThickness / 2,
//                         endSection.LF / 2 + webThickness / 2,
//                     ]);

//                     ufSub.push([
//                         benchMarkName,
//                         -boxLength / 2,
//                         supportSection.UF,
//                         supportSection.UF,
//                         endSection.UF / 2 + webThickness / 2,
//                         endSection.UF / 2 + webThickness / 2,
//                     ]);
//                     lfSub.push([
//                         benchMarkName,
//                         -boxLength / 2,
//                         supportSection.LF,
//                         supportSection.LF,
//                         endSection.LF / 2 + webThickness / 2,
//                         endSection.LF / 2 + webThickness / 2,
//                     ]);

//                     ufSub.push([
//                         "end",
//                         0,
//                         supportSection.UF,
//                         supportSection.UF,
//                         supportSection.UF / 2 - common.B / 2,
//                         supportSection.UF / 2 - common.B / 2,
//                     ]);
//                     lfSub.push([
//                         "end",
//                         0,
//                         supportSection.LF,
//                         supportSection.LF,
//                         supportSection.LF / 2 - common.B / 2,
//                         supportSection.LF / 2 - common.B / 2,
//                     ]);

//                     uRibSub.push([benchMarkName, -boxLength / 2 - taperMargin, 0, 0, ""]);
//                     lRibSub.push([benchMarkName, -boxLength / 2 - taperMargin, 0, 0, ""]);
//                     uRibSub.push(["end", 0, RibThickness, RibHeight, "-400,400"]);
//                     lRibSub.push(["end", 0, bottomRibThickness, bottomRibHeight, "-400,400"]);
//                 } else {
//                     ufSub.push(["end", 0, endSection.UF, endSection.UF, endSection.UF / 2 + webThickness / 2, endSection.UF / 2 + webThickness / 2]);
//                     lfSub.push(["end", 0, endSection.LF, endSection.LF, endSection.LF / 2 + webThickness / 2, endSection.LF / 2 + webThickness / 2]);
//                     uRibSub.push(["end", 0, 0, 0, ""]);
//                     lRibSub.push(["end", 0, 0, 0, ""]);
//                 }
//             }
//         }
//         ufwLayout.push(ufSub);
//         lfwLayout.push(lfSub);
//         uRib.push(uRibSub);
//         lRib.push(lRibSub);
//     }
//     return { ufwLayout, lfwLayout, uRib, lRib };
// }

function GenDefaultFactoryJoint(girderLayout, common) {
    let girderNum = girderLayout.girderCount;
    let supportNum = girderLayout.supportCount;
    let diaSpacing = 5000; //공통변수
    let TFLayout = [];
    let BFLayout = [];
    let WFLayout = [];
    let thickness1 = 16;
    let thickness2 = 20;
    let thickness3 = 22;
    for (let i = 0; i < girderNum; i++) {
        let TFSub = [];
        let BFSub = [];
        let WFSub = [];

        for (let j = 1; j < supportNum - 1; j++) {
            let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + j.toFixed(0);
            if (j === 1) {
            } else if (j > 1 && j < supportNum - 2) {
                TFSub.push([benchMarkName, -1.75 * diaSpacing, thickness1]);
                BFSub.push([benchMarkName, -1.25 * diaSpacing, thickness2]);
                WFSub.push([benchMarkName, -2.25 * diaSpacing, thickness1]);

                TFSub.push([benchMarkName, 1.75 * diaSpacing, thickness2]);
                BFSub.push([benchMarkName, 1.25 * diaSpacing, thickness3]);
                WFSub.push([benchMarkName, 2.25 * diaSpacing, thickness2]);
            } else if (j === supportNum - 2) {
                TFSub.push(["end", 0, thickness1]);
                BFSub.push(["end", 0, thickness2]);
                WFSub.push(["end", 0, thickness1]);
            }
        }
        TFLayout.push(TFSub);
        BFLayout.push(BFSub);
        WFLayout.push(WFSub);
    }
    return { TFLayout, BFLayout, WFLayout };
}

function GenDefaultStiffPoint(girderLayout, end, support, auto, SEShape) {
    let girderNum = girderLayout.girderCount;
    let supportNum = girderLayout.supportCount;
    let diaSpacing = auto.diaSpacing; //공통변수
    let segMaxLength = auto.segMaxLength;
    let lConcThickness = support.LCONC;
    // let endSpliceSegMax = 9000;
    // let centerSpliceSegMax = 12000;
    // let supportSpliceSegMax = 10000;
    let diaLayout = [];
    let vStiffLayout = [];
    let SpliceLayout = [];
    let lConcLayout = [];
    let gridPointDict = GenDefaultGridPointDict(girderLayout, SEShape);

    for (let i = 0; i < girderNum; i++) {
        let diaSub = [];
        let vStiffSub = [];
        let spliceSub = [];
        let lConcSub = [];
        let skew1 = Math.PI / 2;
        let skew2 = Math.PI / 2;
        for (let j = 1; j < supportNum - 2; j++) {
            let benchMarkName = "G" + (i + 1).toFixed(0) + "S" + j.toFixed(0);
            let ptName1 = "G" + (i + 1).toFixed(0) + "S" + j.toFixed(0);
            let ptName2 = "G" + (i + 1).toFixed(0) + "S" + (j + 1).toFixed(0);
            let point1 = gridPointDict[ptName1];
            let point2 = gridPointDict[ptName2];
            skew1 = point1.skew;
            skew2 = point2.skew;
            let sLength = point2.mainStation - point1.mainStation;
            let diaNum = Math.floor(sLength / diaSpacing);
            let remain = sLength % diaSpacing;
            let diaList = [];
            let vStiffList = [];
            let spList = [];
            let sp = 0;
            let totalSp = 0;
            let a = 0;
            let n = 2; //항상 짝수이어야함
            if (j === 1) {
                while (totalSp < sLength) {
                    diaList.push(totalSp);
                    if (a < n && remain > 0) {
                        sp = (remain + (n - 1) * diaSpacing) / n;
                    } else {
                        sp = diaSpacing;
                    }
                    vStiffList.push(totalSp + sp / 2);
                    spList.push(totalSp + sp / 4, totalSp + (sp * 3) / 4);
                    totalSp += sp;
                    a++;
                    if (a > 100) {
                        break;
                    }
                }
            } else if (j > 1 && j < supportNum - 3) {
                while (totalSp < sLength) {
                    diaList.push(totalSp);
                    if (diaNum % 2 === 0) {
                        //짝수분할
                        if (a >= (diaNum - n) / 2 && a <= (diaNum + n) / 2 && remain > 0) {
                            sp = (remain + n * diaSpacing) / (n + 1);
                        } else {
                            sp = diaSpacing;
                        }
                    } else {
                        // 홀수분할
                        if (a >= (diaNum - n) / 2 && a <= (diaNum + n) / 2 && remain > 0) {
                            sp = (remain + (n - 1) * diaSpacing) / n;
                        } else {
                            sp = diaSpacing;
                        }
                    }
                    vStiffList.push(totalSp + sp / 2);
                    spList.push(totalSp + sp / 4, totalSp + (sp * 3) / 4);
                    totalSp += sp;
                    a++;
                    if (a > 100) {
                        break;
                    }
                }
            } else if (j === supportNum - 3) {
                while (totalSp < sLength) {
                    diaList.push(totalSp);
                    if (a > diaNum - 2 && remain > 0) {
                        sp = (remain + (n - 1) * diaSpacing) / n;
                    } else {
                        sp = diaSpacing;
                    }
                    vStiffList.push(totalSp + sp / 2);
                    spList.push(totalSp + sp / 4, totalSp + (sp * 3) / 4);
                    totalSp += sp;
                    a++;
                    if (a > 100) {
                        break;
                    }
                }
            }
            let spNum = 0;
            let sIndex = 0;
            let eIndex = 0;
            if (j === 1) {
                sIndex = 3;
                eIndex = 2;
            } else if (j > 1 && j < supportNum - 3) {
                sIndex = 1;
                eIndex = 2;
            } else if (j === supportNum - 3) {
                sIndex = 1;
                eIndex = 4;
            }
            spNum = spList.length - sIndex - eIndex;
            if (j === 1) {
                for (let d = 0; d < diaList.length; d++) {
                    if (d === 0 || d === diaList.length - 1) {
                        let skew = ((d === 0 ? skew1 : skew2) * 180) / Math.PI;
                        diaSub.push([benchMarkName, diaList[d], "박스부-지점", skew]);
                    } else {
                        diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    }
                    // if (d === 0 || d === 1) {
                    //     if (end.Box) {
                    //         if (d === 0) {
                    //             diaSub.push([benchMarkName, diaList[d], "박스부-지점", skew1]);
                    //         } else {
                    //             diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    //         }
                    //     } else {
                    //         diaSub.push([benchMarkName, diaList[d], "플레이트-상-볼트", 90]);
                    //     }
                    // } else if (d === 2) {
                    //     if (end.Box) {
                    //         diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    //     } else {
                    //         diaSub.push([benchMarkName, diaList[d], "플레이트-중-볼트", 90]);
                    //     }
                    // } else if (d > 2 && d < diaList.length - 3) {
                    //     if (end.Box && d === 3) {
                    //         diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90]);
                    //     } else {
                    //         diaSub.push([benchMarkName, diaList[d], "플레이트-중", 90]);
                    //     }
                    // } else if (d === diaList.length - 3) {
                    //     diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90]);
                    // } else if (d === diaList.length - 2 || d === diaList.length - 1) {
                    //     diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    // } else {
                    //     diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    // }
                }
                for (let v = 0; v < vStiffList.length; v++) {
                    if (v < 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    } else if (v < diaList.length - 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "수직보강2"]);
                    } else {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    }
                    // if (v < 2) {
                    //     if (end.Box) {
                    //         vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    //     } else {
                    //         vStiffSub.push([benchMarkName, vStiffList[v], "수직보강1"]);
                    //     }
                    // } else if (v < diaList.length - 2) {
                    //     vStiffSub.push([benchMarkName, vStiffList[v], "수직보강2"]);
                    // } else {
                    //     vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    // }
                }
            } else if (j > 1 && j < supportNum - 3) {
                for (let d = 0; d < diaList.length; d++) {
                    if (d === 0) {
                        diaSub.push([benchMarkName, diaList[d], "박스부-지점", 90]);
                    } else {
                        diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    }
                    // else if (d === 1 || d === 2) {
                    //     diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    // } else if (d === 3) {
                    //     diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90]);
                    // } else if (d > 3 && d < diaList.length - 3) {
                    //     diaSub.push([benchMarkName, diaList[d], "플레이트-중", 90]);
                    // } else if (d === diaList.length - 3) {
                    //     diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90]);
                    // } else if (d === diaList.length - 2 || d === diaList.length - 1) {
                    //     diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    // }
                }
                for (let v = 0; v < vStiffList.length; v++) {
                    if (v < 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    } else if (v < diaList.length - 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "수직보강2"]);
                    } else {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    }
                }
            } else if (j === supportNum - 3) {
                for (let d = 0; d < diaList.length; d++) {
                    if (d === 0 || d === diaList.length - 1) {
                        diaSub.push([benchMarkName, diaList[d], "박스부-지점", 90]);
                    } else {
                        diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    }
                    // if (d === 0) {
                    //     diaSub.push([benchMarkName, diaList[d], "박스부-지점", 90]);
                    // } else if (d === 1 || d === 2) {
                    //     diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    // } else if (d === 3) {
                    //     diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90]);
                    // } else if (d > 3 && d < diaList.length - 3) {
                    //     diaSub.push([benchMarkName, diaList[d], "플레이트-중", 90]);
                    // } else if (d === diaList.length - 3) {
                    //     if (end.Box) {
                    //         diaSub.push([benchMarkName, diaList[d], "플레이트-하", 90]);
                    //     } else {
                    //         diaSub.push([benchMarkName, diaList[d], "플레이트-중-볼트", 90]);
                    //     }
                    // } else if (d === diaList.length - 2 || d === diaList.length - 1) {
                    //     if (end.Box) {
                    //         diaSub.push([benchMarkName, diaList[d], "박스부-중앙홀", 90]);
                    //     } else {
                    //         diaSub.push([benchMarkName, diaList[d], "플레이트-상-볼트", 90]);
                    //     }
                    // }
                }
                for (let v = 0; v < vStiffList.length; v++) {
                    if (v < 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    } else if (v < diaList.length - 2) {
                        vStiffSub.push([benchMarkName, vStiffList[v], "수직보강2"]);
                    } else {
                        vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    }
                    // if (v < 2) {
                    //     vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    // } else if (v < diaList.length - 2) {
                    //     vStiffSub.push([benchMarkName, vStiffList[v], "수직보강2"]);
                    // } else {
                    //     if (end.Box) {
                    //         vStiffSub.push([benchMarkName, vStiffList[v], "박스부-수직보강"]);
                    //     } else {
                    //         vStiffSub.push([benchMarkName, vStiffList[v], "수직보강1"]);
                    //     }
                    // }
                }
            }
            spNum = spNum > 30 ? 30 : spNum;
            let spRull2 = [];
            let firstMaxLength = 0;
            let lastMaxLength = 0;
            if (j === 1 && j === supportNum - 3) {
                //단경간의 경우
                firstMaxLength = segMaxLength;
                lastMaxLength = segMaxLength;
            } else {
                if (j === 1) {
                    // 첫경간
                    firstMaxLength = segMaxLength;
                    lastMaxLength = segMaxLength / 2;
                } else if (j === supportNum - 3) {
                    //마지막경간
                    firstMaxLength = segMaxLength / 2;
                    lastMaxLength = segMaxLength;
                } else {
                    firstMaxLength = segMaxLength / 2;
                    lastMaxLength = segMaxLength / 2;
                }
            }
            spRull2 = optimizeSplice(spList, totalSp, segMaxLength, firstMaxLength, lastMaxLength);
            spRull2.forEach(elem => spliceSub.push([benchMarkName, Math.round(spList[elem]), "현장이음1"]));
            if (end.Box) {
                if (j === 1) {
                    lConcSub.push([benchMarkName, "G" + (i + 1).toFixed(0) + "D" + "2", lConcThickness, lConcThickness]);
                }
                if (j < supportNum - 3 && supportNum > 4) {
                    lConcSub.push([
                        "G" + (i + 1).toFixed(0) + "D" + String(diaSub.length - 1),
                        "G" + (i + 1).toFixed(0) + "D" + String(diaSub.length + 3),
                        lConcThickness,
                        lConcThickness,
                    ]);
                }
                if (j === supportNum - 3) {
                    lConcSub.push([
                        "G" + (i + 1).toFixed(0) + "D" + String(diaSub.length),
                        "G" + (i + 1).toFixed(0) + "S" + (supportNum - 2).toFixed(0),
                        lConcThickness,
                        lConcThickness,
                    ]);
                }
            } else {
                if (j < supportNum - 3) {
                    lConcSub.push([
                        benchMarkName,
                        "G" + (i + 1).toFixed(0) + "D" + String(diaSub.length - 1),
                        benchMarkName,
                        "G" + (i + 1).toFixed(0) + "D" + String(diaSub.length + 2),
                        lConcThickness,
                        lConcThickness,
                    ]);
                }
            }
        }

        diaSub.push(["G" + (i + 1).toFixed(0) + "S" + (supportNum - 2).toFixed(0), 0, "박스부-지점", (skew2 * 180) / Math.PI]);
        // if (end.Box) {
        //     diaSub.push(["G" + (i + 1).toFixed(0) + "S" + (supportNum - 2).toFixed(0), 0, "박스부-지점", skew2]);
        // } else {
        //     diaSub.push(["G" + (i + 1).toFixed(0) + "S" + (supportNum - 2).toFixed(0), 0, "플레이트-상-볼트", skew2]);
        // }

        diaLayout.push(diaSub);
        vStiffLayout.push(vStiffSub);
        SpliceLayout.push(spliceSub);
        lConcLayout.push(lConcSub);
    }

    let diaToXbeam = {
        "플레이트-하": "플레이트-하",
        "플레이트-중": "플레이트-중",
        "플레이트-중-볼트": "플레이트-중",
        "플레이트-상-볼트": "플레이트-상",
        "박스부-중앙홀": "박스부",
        "박스부-지점": "박스부",
    };
    let xbeamLayout = [];
    let supportIndex = [];
    for (let i = 0; i < diaLayout.length; i++) {
        supportIndex.push([]);
        for (let j = 0; j < diaLayout[i].length; j++) {
            if (diaLayout[i][j][1] === 0) {
                supportIndex[i].push(j);
            }
        }
    }
    for (let i = 0; i < supportIndex.length - 1; i++) {
        for (let j = 0; j < supportIndex[i].length; j++) {
            xbeamLayout.push([
                "G" + (i + 1).toString() + "D" + (supportIndex[i][j] + 1).toString(),
                "G" + (i + 2).toString() + "D" + (supportIndex[i + 1][j] + 1).toString(),
                diaToXbeam[diaLayout[i][supportIndex[i][j]][2]],
            ]);
            if (j < supportIndex[i].length - 1) {
                let li = supportIndex[i][j + 1];
                let ri = supportIndex[i + 1][j + 1];
                let iter = Math.min(li - supportIndex[i][j], ri - supportIndex[i + 1][j]);
                if (j === supportIndex[i].length - 2) {
                    for (let x = 1; x < iter; x++) {
                        xbeamLayout.push([
                            "G" + (i + 1).toString() + "D" + (supportIndex[i][j] + x + 1).toString(),
                            "G" + (i + 2).toString() + "D" + (supportIndex[i + 1][j] + x + 1).toString(),
                            diaToXbeam[diaLayout[i][supportIndex[i][j] + x][2]],
                        ]);
                    }
                } else {
                    for (let x = iter - 1; x > 0; x--) {
                        xbeamLayout.push([
                            "G" + (i + 1).toString() + "D" + (li - x + 1).toString(),
                            "G" + (i + 2).toString() + "D" + (ri - x + 1).toString(),
                            diaToXbeam[diaLayout[i][li - x][2]],
                        ]);
                    }
                }
            }
        }
    }
    return { diaLayout, vStiffLayout, SpliceLayout, xbeamLayout, lConcLayout };
}

function optimizeSplice(spList, totalSp, segMaxLength, firstMaxLength, lastMaxLength) {
    let firstIndex = 0;
    let lastIndex = 0;
    for (let sp = 0; sp < spList.length; sp++) {
        if (spList[sp] <= firstMaxLength) {
            firstIndex = sp;
        }
        if (totalSp - spList[spList.length - 1 - sp] <= lastMaxLength) {
            lastIndex = spList.length - 1 - sp;
        }
    }

    let m = Math.ceil((spList[lastIndex] - spList[firstIndex]) / segMaxLength);
    let k = (spList[lastIndex] - spList[firstIndex]) / m;
    let optIndex = [firstIndex];
    let dummy1 = spList[firstIndex];
    let newSp = firstIndex;
    for (let ii = 0; ii < m - 1; ii++) {
        let optLength = Infinity;
        dummy1 = spList[newSp];
        let startIndex = newSp;
        for (let sp = startIndex + 1; sp < lastIndex; sp++) {
            if (Math.abs(spList[sp] - dummy1 - k) < optLength) {
                optLength = Math.abs(spList[sp] - dummy1 - k);
                newSp = sp;
            }
        }
        optIndex.push(newSp);
    }
    optIndex.push(lastIndex);
    return optIndex;
}

function GenWebPoint(point1, point2, tan1, H) {
    let x;
    let y;
    if (point1.x === point2.x) {
        x = point1.x;
        y = tan1 === null ? null : tan1 * x + H;
    } else {
        let a = (point1.y - point2.y) / (point1.x - point2.x);
        let b = point1.y - a * point1.x;
        x = tan1 === null ? point1.x : (b - H) / (tan1 - a);
        y = a * x + b;
    }
    return { x, y };
}

function GenGirderRestPoint(point1, point2, tan1, tan2, thickness) {
    let x3;
    let x4;
    let y3;
    let y4;
    if (point1.x === point2.x) {
        x3 = point1.x + thickness;
        x4 = point2.x + thickness;
        y3 = tan1 === null ? point1.y : tan1 * (x3 - point1.x) + point1.y;
        y4 = tan2 === null ? point2.y : tan2 * (x4 - point2.x) + point2.y;
    } else {
        let a = (point1.y - point2.y) / (point1.x - point2.x);
        let b = point1.y - a * point1.x;
        // let sign = a > 0 ? 1 : -1;
        let alpha = a === 0 ? thickness : thickness * Math.sqrt(1 + 1 / a ** 2);
        if (Math.abs(1 / tan1) < 0.001) {
            x3 = point1.x;
        } else {
            if (a === 0) {
                x3 = tan1 === null ? point1.x : point1.x + thickness / tan1;
            } else {
                x3 = tan1 === null ? point1.x : (-a * alpha + b + tan1 * point1.x - point1.y) / (tan1 - a);
            }
        }
        if (Math.abs(1 / tan2) < 0.001) {
            x4 = point2.x;
        } else {
            if (a === 0) {
                x4 = tan2 === null ? point2.x : point2.x + thickness / tan2;
            } else {
                x4 = tan2 === null ? point2.x : (-a * alpha + b + tan2 * point2.x - point2.y) / (tan2 - a);
            }
        }
        y3 = a === 0 ? point1.y + thickness : a * (x3 - alpha) + b;
        y4 = a === 0 ? point2.y + thickness : a * (x4 - alpha) + b;
    }
    return [point1, point2, { x: x4, y: y4 }, { x: x3, y: y3 }];
}

function GenDefaultStud(girderStation, sectionPointDict) {
    let result = [];
    let spacing = 400;
    for (let i = 0; i < girderStation.length; i++) {
        let startKey = "G" + (i + 1).toFixed(0) + "K1";
        let endKey = "";
        let startOffset = 200;
        let endOffset = 350;
        for (let j in girderStation[i]) {
            if (girderStation[i][j].key.includes("TW") || girderStation[i][j].key.includes("K6") || girderStation[i][j].key.includes("SP")) {
                endKey = girderStation[i][j].key;
                let w = sectionPointDict[endKey].backward.input.wuf;
                let isSeparated = sectionPointDict[endKey].backward.input.isSeparated;

                startOffset = startKey.includes("SP") ? 350 : 200;
                endOffset = endKey.includes("SP") ? 350 : 200;
                let layout = isSeparated ? "auto" : "auto"; //플랜지 중앙점을 기준으로 배치하는게 더 직관적일 듯함.
                // result.push({ start: startKey, end: endKey, startOffset: startOffset, endOffset: endOffset, spacing: spacing, layout: layout })
                result.push([startKey, endKey, startOffset, endOffset, spacing, layout]);
                startKey = endKey;
            }
        }
    }
    return result;
}

function GenDefaultJackup(girderStation, sectionPointDict) {
    let result = [];
    let both = true;
    let layout1 = "";
    let layout2 = "";
    let height = 0;
    let thickness1 = 0;
    let thickness2 = 0;
    let length1 = 0;
    let length2 = 0;
    let supportNum = 0;
    for (let j in girderStation[0]) {
        if (girderStation[0][j].key.includes("S") && !girderStation[0][j].key.includes("SP")) {
            supportNum += 1;
        }
    }
    for (let i in girderStation) {
        let key = "";
        let isStart = true;
        for (let j in girderStation[i]) {
            if (girderStation[i][j].key.includes("S") && !girderStation[i][j].key.includes("SP")) {
                key = girderStation[i][j].key;
                let isSeparated = sectionPointDict[key].forward.input.isSeparated;
                if (isSeparated) {
                    if (isStart) {
                        layout1 = "400,600";
                        isStart = false;
                    } else {
                        layout1 = "-400,-600";
                    }
                    layout2 = "-200,200";
                    height = 150;
                    thickness1 = 20;
                    thickness2 = 26;
                    length1 = 400;
                    length2 = 300;
                    // result.push({ position: key, layout: layout1, length: length1, height: height, thickness: thickness1, chamfer: height - 10, both: both })
                    // result.push({ position: key, layout: layout2, length: length2, height: height, thickness: thickness2, chamfer: height - 10, both: both })
                    result.push([key, layout1, length1, height, thickness1, height - 10, both]);
                    result.push([key, layout2, length2, height, thickness2, height - 10, both]);
                } else {
                    if (key.includes("S1")) {
                        layout1 = "400,550,700";
                    } else if (key.includes("S" + supportNum.toFixed(0))) {
                        layout1 = "-700,-550,-400";
                    } else {
                        layout1 = "-700,-550,-400,400,550,700";
                    }
                    height = 100;
                    length1 = 900;
                    thickness1 = 22;
                    // result.push({ position: key, layout: layout1, length: length1, height: height, thickness: thickness1, chamfer: height - 10, both: both })
                    result.push([key, layout1, length1, height, thickness1, height - 10, both]);
                }
            }
        }
    }
    return result;
}

function GenDefaultSupport(girderStation, sectionPointDict) {
    let result = [];
    let offset = 0;
    let solePlate1 = [300, 300, 26]; //[폭,너비,높이]
    let solePlate2 = [750, 750, 26]; //[폭,너비,높이]
    let type1 = "";
    let supportKeyList = [];
    for (let i in girderStation) {
        supportKeyList.push([]);
        for (let j in girderStation[i]) {
            if (girderStation[i][j].key.includes("S") && !girderStation[i][j].key.includes("SP")) {
                supportKeyList[i].push(girderStation[i][j].key);
            }
        }
    }
    let supportNum = supportKeyList[0].length;
    let key = "";
    let girderNum = supportKeyList.length;

    let fixedIndex = [Math.floor((girderNum - 1) / 2), Math.floor((supportNum - 1) / 2)];
    for (let i = 0; i < supportKeyList.length; i++) {
        for (let j = 0; j < supportNum; j++) {
            key = supportKeyList[i][j];
            let isSeparated = sectionPointDict[key].forward.input.isSeparated;
            if (i === fixedIndex[0]) {
                if (j === fixedIndex[1]) {
                    type1 = "고정단";
                } else {
                    type1 = "종방향가동";
                }
            } else {
                if (j === fixedIndex[1]) {
                    type1 = "횡방향가동";
                } else {
                    type1 = "양방향단";
                }
            }
            if (isSeparated) {
                result.push([key + "L", type1, offset, solePlate1[0], solePlate1[1], solePlate1[2]]);
                result.push([key + "R", type1, offset, solePlate1[0], solePlate1[1], solePlate1[2]]);
            } else {
                result.push([key, type1, offset, solePlate2[0], solePlate2[1], solePlate2[2]]);
            }
        }
    }
    return result;
}

function GenDefaultHStiffner(girderStation, sectionPointDict) {
    let result = [];
    let width = 180;
    let chamfer = width - 10;
    let thickness = 16;
    let offset1 = 400;
    let offset2 = 400;
    let startMargin = 42;
    let endMargin = 42;
    let supportStationList = [];
    for (let i in girderStation) {
        supportStationList.push([]);
        for (let j in girderStation[i]) {
            if (girderStation[i][j].key.includes("S") && !girderStation[i][j].key.includes("SP")) {
                supportStationList[i].push(girderStation[i][j].point.girderStation);
            }
        }
    }
    let tensionRegion = []; // 인장기준 0.2~0.8
    let compressRegion = []; // 압축기준 -0.4 ~ 0.4
    for (let i in supportStationList) {
        tensionRegion.push([]);
        compressRegion.push([]);
        for (let j = 0; j < supportStationList[i].length - 1; j++) {
            let length = supportStationList[i][j + 1] - supportStationList[i][j];
            if (j === 0) {
                tensionRegion[i].push([0, supportStationList[i][j + 1] - 0.2 * length]);
            } else if (j === supportStationList[i].length - 2) {
                tensionRegion[i].push([supportStationList[i][j] + 0.2 * length, supportStationList[i][j + 1]]);
            } else {
                tensionRegion[i].push([supportStationList[i][j] + 0.2 * length, supportStationList[i][j + 1] - 0.2 * length]);
            }
            if (j > 0) {
                compressRegion[i].push([supportStationList[i][j] - 0.4 * length, supportStationList[i][j] + 0.4 * length]);
            }
        }
    }
    for (let i in girderStation) {
        for (let j = 0; j < girderStation[i].length - 1; j++) {
            let key1 = girderStation[i][j].key;
            let bool1 = ["SP", "K1", "K6", "D", "V"].some(el => key1.includes(el));
            if (bool1) {
                let pt1 = girderStation[i][j].point;
                for (let k = j + 1; k < girderStation[i].length; k++) {
                    let key2 = girderStation[i][k].key;
                    let pt2 = girderStation[i][k].point;
                    let bool2 = ["SP", "K1", "K6", "D", "V"].some(el => key2.includes(el));
                    if (pt2.girderStation - pt1.girderStation > width * 2 && bool2) {
                        let station = (pt2.girderStation + pt1.girderStation) / 2;
                        let startOff = key1.includes("SP") ? 600 / 2 + 30 : startMargin;
                        let endOff = key2.includes("SP") ? 600 / 2 + 30 : endMargin;
                        for (let t in tensionRegion[i]) {
                            if (station >= tensionRegion[i][t][0] && station <= tensionRegion[i][t][1]) {
                                // result.push({ from, to, startOffset: endOffset, width, thickness, chamfer, isTop, offset})
                                result.push([key1, key2, startOff, endOff, width, thickness, chamfer, true, offset1, offset2]);
                                break;
                            }
                        }
                        for (let t in compressRegion[i]) {
                            if (station >= compressRegion[i][t][0] && station <= compressRegion[i][t][1]) {
                                // result.push({ from, to, startOffset: endOffset, width, thickness, chamfer, isTop, offset})
                                let cOffset1 = offset1;
                                let cOffset2 = offset2;
                                if (sectionPointDict[key1].forward.input.Tcl > 0) {
                                    cOffset1 = sectionPointDict[key1].forward.input.Tcl + 200;
                                    cOffset2 = sectionPointDict[key2].backward.input.Tcl + 200;
                                }
                                result.push([key1, key2, startOff, endOff, width, thickness, chamfer, false, cOffset1, cOffset2]);
                                break;
                            }
                        }
                        j = k - 1;
                        break;
                    }
                }
            }
        }
    }
    return result;
}
