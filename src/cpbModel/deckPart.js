import { IntersectionPointOnSpline, LineToOffsetSpline, Loft, MainPointGenerator, p, PointToGlobal, PointToSkewedGlobal, Rebar, TwoLineIntersect, TwoPointsLength, WebPoint } from "@nexivil/package-modules";
import { concToRebarOffset, DivideRebarSpacing, LoftCutBySpline, RebarPointGen } from "@nexivil/package-modules/src/temp";
import { PointSectionInfo2 } from "./context";
import { BarrierRebarModel, SlabRebarFn } from "./rebar";


export function CPBDeckPart(
    girderLayout,
    stPointDict,
    centerLineStations,
    girderStation,
    sectionPointDict,
    girderBaseInfo,
    mainPartInput,
    xbeamGrid,
    deckPartInput,
    crossKeys
    ) {
    let deckModel = DeckSectionPoint(
        girderLayout,
        stPointDict,
        centerLineStations,
        girderStation,
        sectionPointDict,
        girderBaseInfo,
        mainPartInput,
        xbeamGrid,
        crossKeys
    )
    let barrier = BarrierSectionPointV2(girderLayout, centerLineStations, girderBaseInfo, mainPartInput, stPointDict, deckPartInput.barrierLayoutInput, deckPartInput.barrierSection)
    let slabRebar = SlabRebarFn(deckModel.deckPointDict, girderLayout, stPointDict, deckPartInput, girderBaseInfo)
    let barrierRebar = BarrierRebarModel(deckPartInput.barrierRebar, barrier.newbarrierDict['children'],girderLayout.alignment, deckModel.deckPointDict)
    return [ 
    ...deckModel.deckPointDict['children'], 
    ...barrier.newbarrierDict['children'], 
    ...barrier.newpavementDict['children'], 
    ...slabRebar['children'],
    ...barrierRebar['children'],
    ]
    // return [...rebar['children']]
}
export function DeckSectionPoint(
    girderLayout,
    stPointDict,
    centerLineStations,
    girderStation,
    sectionPointDict,
    girderBaseInfo,
    mainPartInput,
    xbeamGrid,
    crossKeys
) {
    const alignment = girderLayout.alignment;
    let slabLayout = mainPartInput.slabLayout
    let deckPointDict = { parent: [], children: [], upperDict:{}}
    
    const position = 0;
    const T = 2;
    const H = 1;
    let haunch = girderBaseInfo.support.HaunchH; //slabInfo.haunchHeight;
    let girderNum = girderLayout.girderCount
    let PavementT = girderBaseInfo.common.PavementT
    let blockOutH = girderBaseInfo.common.blockOutH
    let blockOutL = girderBaseInfo.common.blockOutL
    let endT = 0;
    let leftOffset = 0;
    let rightOffset = 0;
    let leftOffset2 = 0;
    let rightOffset2 = 0;
    let slabThickness = 0;
    let LgirderLine = girderLayout.girderSplines[0];
    let RgirderLine = girderLayout.girderSplines[girderLayout.girderSplines.length - 1];
    const group = "deck"

    //deckPointDict 새로모델 작성 2022.06.01
    //가로보가 경사인 경우 가로보에 따른 바닥판 변화부 다시 작성 및 가로보 헌치부분 길이방향 단면이 이상함
    //단부 헌치기 0인 경우에도 상부플렌지가 수평인경우 헌치가 발생하는 오류 발생
    let kLineList = [];
    for (let i = 1; i < centerLineStations.length - 1; i++) { 
        let mainPoint = centerLineStations[i].point
        if (centerLineStations[i].key.includes("CRK")){
            let station = centerLineStations[i].station;
            for (let j = 0; j < slabLayout.length - 1; j++) { //upperSlabPoint에 대한 함수화 예정
                let ss = stPointDict[slabLayout[j][position]].mainStation;
                let es = stPointDict[slabLayout[j + 1][position]].mainStation;
                if (station >= ss && station <= es) {
                    let x = station - ss;
                    let l = es - ss;
                    leftOffset2 = slabLayout[j][3] * (l - x) / l + slabLayout[j + 1][3] * (x) / l;
                    rightOffset2 = slabLayout[j][4] * (l - x) / l + slabLayout[j + 1][4] * (x) / l;
                }
            }
            //slabSide 도면에 사용되는 변수생성
            let lLine = LineToOffsetSpline(LgirderLine, leftOffset2)
            let rLine = LineToOffsetSpline(RgirderLine, rightOffset2)
            let leftPoint = IntersectionPointOnSpline(lLine, mainPoint, alignment);
            let rightPoint = IntersectionPointOnSpline(rLine, mainPoint, alignment);
            kLineList.push([
            leftPoint, rightPoint
            ])
        }
    }
    let slabUpperAll = [];
    let blockLoft = [];
    let startCap = [];
    let endCap = [];
    for (let i = 1; i < centerLineStations.length - 1; i++) { 
        let mainPoint = centerLineStations[i].point
        let key = centerLineStations[i].key
        if (!key.includes("CRX") && !key.includes("TW")){
            let station = mainPoint.mainStation;
            let leftgirderPoint = IntersectionPointOnSpline(LgirderLine, mainPoint, alignment);
            let rightgirderPoint = IntersectionPointOnSpline(RgirderLine, mainPoint, alignment);

            for (let j = 0; j < slabLayout.length - 1; j++) { //upperSlabPoint에 대한 함수화 예정
                let ss = stPointDict[slabLayout[j][position]].mainStation;
                let es = stPointDict[slabLayout[j + 1][position]].mainStation;
                if (station >= ss && station <= es) {
                    let x = station - ss;
                    let l = es - ss;
                    let lcos = (mainPoint.normalCos * leftgirderPoint.normalCos + mainPoint.normalSin * leftgirderPoint.normalSin);
                    let rcos = (mainPoint.normalCos * rightgirderPoint.normalCos + mainPoint.normalSin * rightgirderPoint.normalSin);
                    leftOffset = (slabLayout[j][3] * (l - x) / l + slabLayout[j + 1][3] * (x) / l) / lcos + leftgirderPoint.offset;
                    rightOffset = (slabLayout[j][4] * (l - x) / l + slabLayout[j + 1][4] * (x) / l) / rcos + rightgirderPoint.offset;
                    leftOffset2 = slabLayout[j][3] * (l - x) / l + slabLayout[j + 1][3] * (x) / l;
                    rightOffset2 = slabLayout[j][4] * (l - x) / l + slabLayout[j + 1][4] * (x) / l;
                    slabThickness = slabLayout[j][H] * (l - x) / l + slabLayout[j + 1][H] * (x) / l;
                    endT = slabLayout[j][T] * (l - x) / l + slabLayout[j + 1][T] * (x) / l;
                    haunch = slabLayout[j][5]; //헌치의 변화에 따른 경계면에 대한 솔루션이 필요함
                }
            }
            //slabSide 도면에 사용되는 변수생성
            let lLine = LineToOffsetSpline(LgirderLine, leftOffset2)
            let rLine = LineToOffsetSpline(RgirderLine, rightOffset2)
            let leftPoint = IntersectionPointOnSpline(lLine, mainPoint, alignment);
            let rightPoint = IntersectionPointOnSpline(rLine, mainPoint, alignment);
            let bool = kLineList.some(kline => Boolean(TwoLineIntersect(kline, [leftPoint, rightPoint]))) 
            if (!bool || ["CRK"].some(k=>key.includes(k))){
                deckPointDict.upperDict[key] = {leftPoint, rightPoint}
                let lw = lowerSlabCantil(leftgirderPoint, stPointDict, girderBaseInfo, mainPartInput, 0); //sectionPoint가 있으면 없으면 될듯함
                let rw = lowerSlabCantil(rightgirderPoint, stPointDict, girderBaseInfo, mainPartInput, girderNum-1); //sectionPoint가 있으면 없으면 될듯함
                let block = [0];
                if (["K0", "K1", "K6", "K7"].some(k=>key.includes(k))){
                    block = [blockOutH];
                } else if (key.includes("B0")){
                    block = [blockOutH, 0];
                } else if (key.includes("B7")){
                    block = [0, blockOutH];
                }
                for (let a of block){
                    let slabUpperPoints = [
                        PointToSkewedGlobal(lw[1], leftgirderPoint),
                        PointToSkewedGlobal(lw[0], leftgirderPoint),
                        PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT - endT }, leftPoint),
                        PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT-a }, leftPoint),
                        PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT-a }, mainPoint),
                        PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT-a }, rightPoint),
                        PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT - endT }, rightPoint),
                        PointToSkewedGlobal(rw[3], rightgirderPoint),
                        PointToSkewedGlobal(rw[2], rightgirderPoint),
                    ];
                    slabUpperAll.push(slabUpperPoints)
                    if(key.includes("K0")){
                        startCap.push(...slabUpperPoints.slice().reverse())
                    }
                    if(key.includes("K7")){
                        endCap.push(...slabUpperPoints.slice().reverse())
                    }
                    if (a>0){ //endBlockOut에 대한 객체 생성코드
                        blockLoft.push(
                            [PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT-a }, leftPoint),
                            PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT-a }, mainPoint),
                            PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT-a }, rightPoint),
                            PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT }, rightPoint),
                            PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT }, mainPoint),
                            PointToSkewedGlobal({ x: 0, y: - girderBaseInfo.common.PavementT }, leftPoint)]
                        )
                    }
                }
                if (key.includes("B0") && blockLoft.length>1){
                    deckPointDict["children"].push(new Loft(blockLoft, true, "stud", { group : group, key: "startBlockOut", part: "concrete" }))
                    blockLoft = [];
                }
                if (key.includes("K7") && blockLoft.length>1){
                    deckPointDict["children"].push(new Loft(blockLoft, true, "stud", { group : group, key: "endBlockOut", part: "concrete" }))
                    blockLoft = [];
                }
                
            }
        }
    }
    deckPointDict["children"].push(new Loft(slabUpperAll, false, "concrete", { group : group, key: "slab", part: "concrete" }))

    for (let j = 0; j < girderStation.length; j++) {
        let girderLine = girderLayout.girderSplines[j];
        let dummyStation = -Infinity;
        let  slabLowerPoints = [];
        let dummySub = [];
        for (let i = 0; i< girderStation[j].length;i++){
            let key = girderStation[j][i].key
            let station = girderStation[j][i].station
            if (!crossKeys.includes(key)){
            let isHaunch = true;
            if (station <=stPointDict["G" + String(j+1)+ "K2"].mainStation || station >=stPointDict["G" + String(j+1) + "K5"].mainStation){
                isHaunch = false
            }
            if (station>dummyStation){
                let bool = false
                let slabLowerSub0 = []; // K0/K7에 대한 단면
                let slabLowerSub = [];
                let slabLowerSub2 = [];
                let girderPoint = stPointDict[key];
                let sectionPointB = sectionPointDict[key].backward;
                let sectionPointF = sectionPointDict[key].forward;
                let isForward = undefined
                if (sectionPointB.input.isClosedTop && !sectionPointF.input.isClosedTop){
                    isForward = true
                } else if (!sectionPointB.input.isClosedTop && sectionPointF.input.isClosedTop){
                    isForward = false
                }
                if (isForward === undefined){
                    let lw = lowerSlabeGeneral(girderPoint, stPointDict, girderBaseInfo, mainPartInput, j, isHaunch); //sectionPoint가 있으면 없으면 될듯함
                    if (key.includes("K1")){
                        lw.forEach(element => slabLowerSub0.push(PointToSkewedGlobal(element, stPointDict["G" + String(j+1) + "K0"], )));

                    } else if (key.includes("K6")){
                        lw.forEach(element => slabLowerSub0.push(PointToSkewedGlobal(element, stPointDict["G" + String(j+1) + "K7"])));
                    }
                    lw.forEach(element => slabLowerSub.push(PointToSkewedGlobal(element, girderPoint)));
                } else {
                    if (isForward){
                        let girderPoint2 = IntersectionPointOnSpline(girderLine, MainPointGenerator(station + 100, alignment, girderPoint.skew), alignment);
                        let lws = lowerSlabOpen(girderPoint2, stPointDict, girderBaseInfo, mainPartInput, j, isForward); //sectionPoint가 있으면 없으면 될듯함 
                        
                        lws[0].forEach(element => slabLowerSub.push(PointToSkewedGlobal(element, girderPoint2)));
                        lws[1].forEach(element => slabLowerSub2.push(PointToSkewedGlobal(element, girderPoint2)));
                        
                    } else {
                        let girderPoint2 = IntersectionPointOnSpline(girderLine, MainPointGenerator(station - 100, alignment, girderPoint.skew), alignment);
                        let lws = lowerSlabOpen(girderPoint2, stPointDict, girderBaseInfo, mainPartInput, j, isForward); //sectionPoint가 있으면 없으면 될듯함 
                        lws[0].forEach(element => slabLowerSub.push(PointToSkewedGlobal(element, girderPoint2)));
                        lws[1].forEach(element => slabLowerSub2.push(PointToSkewedGlobal(element, girderPoint2)));
                    }
                }
                if (dummySub.length > 0 ){
                    bool = TwoLineIntersect([slabLowerSub[0],slabLowerSub[slabLowerSub.length-1]], [dummySub[0],dummySub[dummySub.length-1]])
                }
                
                let CRNbool = true
                if ((station >stPointDict["G" + String(j+1)+"K2"].mainStation 
                && station < stPointDict["G" + String(j+1)+"K3"].mainStation) 
                || (station >stPointDict["G" + String(j+1)+"K4"].mainStation 
                && station < stPointDict["G" + String(j+1)+"K5"].mainStation)){ 
                    CRNbool = false}
                if( (!bool || key.includes("K"))&&CRNbool){
                    if (key.includes("K1")){slabLowerPoints.push(slabLowerSub0)}
                    slabLowerPoints.push(slabLowerSub)
                    if (slabLowerSub2.length>0){ slabLowerPoints.push(slabLowerSub2)}
                    dummySub = slabLowerSub
                    if (key.includes("K6")){slabLowerPoints.push(slabLowerSub0)}
                }
                dummyStation = station
                if(key.includes("K1")){
                    startCap.push(...slabLowerSub0)
                }
                if(key.includes("K6")){
                    endCap.push(...slabLowerSub0)
                }
            }
        }
        }
        deckPointDict["children"].push(new Loft(slabLowerPoints, false, "concrete", { group : group, key: "slab", part: "concrete" }))
    }
    deckPointDict["children"].push(new Loft([startCap], true, "concrete", { group : group, key: "slab", part: "concrete" }))
    deckPointDict["children"].push(new Loft([endCap], true, "concrete", { group : group, key: "slab", part: "concrete" }))

    // console.log("xbeamGrid", xbeamGrid, "xbeamGrid폐기(여기서밖에 안씀) 모든 xbeam에 대한 정보를 가져오면 사각에서 비정형 Xbeam 바닥판 작도가 해결됨")
    for (let j = 0; j < girderNum-1; j++) {
        let girderLine = girderLayout.girderSplines[j];
        let girderLine2 = girderLayout.girderSplines[j+1];
        let dummyStation = -Infinity;
        let  slabLowerPoints = [];
        for (let i = 1; i<centerLineStations.length-1;i++){
            let key = centerLineStations[i].key;
            let mainPoint = centerLineStations[i].point //centerLineStations[i].key.includes("TW")? mainPointGenerator(centerLineStations[i].point.mainStation,alignment,centerLineStations[i].point.skew) :
            let station = mainPoint.mainStation;
            let isHaunch = true;
            if (station <=stPointDict["CRK2"].mainStation || station >=stPointDict["CRK5"].mainStation){
                isHaunch = false
            }
            if(station>dummyStation){
                let girderPoint = IntersectionPointOnSpline(girderLine, mainPoint, alignment);
                let girderPoint2 = IntersectionPointOnSpline(girderLine2, mainPoint, alignment);
                let checkBool = false
                let newSkew = 0;
                let newSec = 1;
                let newSec2 = 1;
                let newSkew2 = 0;
                let B2l = 0;
                let B2r = 0;
                if (centerLineStations[i].key.includes("CRX")) { //가로보부 헌치
                    let xbeamIndex = centerLineStations[i].key.substr(3) * 1 - 1
                    for (let m = 0;m<xbeamGrid[xbeamIndex].gridPoint.length-1;m++) { //로직이 잘못되어 있음
                        if (xbeamGrid[xbeamIndex].gridPoint[m].includes("G" + String(j+1)) &&  xbeamGrid[xbeamIndex].xbeamType[m].includes("박스부")) {
                            checkBool = true
                            let pt1 = stPointDict[xbeamGrid[xbeamIndex].gridPoint[m]]
                            let pt2 = stPointDict[xbeamGrid[xbeamIndex].gridPoint[m+1]]
                            if (Math.min(pt1.mainStation, pt2.mainStation) <=stPointDict["CRK2"].mainStation 
                            || Math.max(pt1.mainStation, pt2.mainStation) >=stPointDict["CRK5"].mainStation){
                                isHaunch = false
                            }
                            if (isHaunch){
                                B2l = sectionPointDict[xbeamGrid[xbeamIndex].gridPoint[m]].forward.input.B2
                                B2r = sectionPointDict[xbeamGrid[xbeamIndex].gridPoint[m+1]].forward.input.B2
                                girderPoint = PointToSkewedGlobal(p(B2l/2,0), pt1) //좌측거더 우측웹 포인트
                                girderPoint2 = PointToSkewedGlobal(p(-B2r/2,0), pt2) //우측거더 좌측웹 포인트
                                let l = TwoPointsLength(girderPoint, girderPoint2, true)
                                let xbeamCos = Math.min(1, (girderPoint2.x - girderPoint.x)/l * girderPoint.normalCos + (girderPoint2.y - girderPoint.y)/l*girderPoint.normalSin)
                                newSec = 1/xbeamCos
                                let xbeamCos2 = Math.min(1, (girderPoint2.x - girderPoint.x)/l * girderPoint2.normalCos + (girderPoint2.y - girderPoint.y)/l*girderPoint2.normalSin)
                                newSec2 = 1/xbeamCos2
                                let sign1 = girderPoint.normalCos*(girderPoint2.y - girderPoint.y) - girderPoint.normalSin*(girderPoint2.x - girderPoint.x)>0? 1:-1
                                let sign2 = girderPoint2.normalCos*(girderPoint2.y - girderPoint.y) - girderPoint2.normalSin*(girderPoint2.x - girderPoint.x)>0? 1:-1
                                newSkew = sign1*Math.acos(xbeamCos);
                                newSkew2 = sign2*Math.acos(xbeamCos2);
                            }
                            break;
                        }
                    } 
                }
                if (checkBool && isHaunch){
                    let lws = lowerSlabXbeam(girderPoint, stPointDict, girderBaseInfo, mainPartInput, j, 300, newSec).right
                    //check!!!!
                    let rws = lowerSlabXbeam(girderPoint2, stPointDict, girderBaseInfo, mainPartInput, j+1, 300, newSec2).left
                    // let lw = UflangePoint3(girderPoint, pointDict, girderBaseInfo, gridInput, j, true, true); //sectionPoint가 있으면 없으면 될듯함
                    // let rw = UflangePoint3(girderPoint2, pointDict, girderBaseInfo, gridInput, j+1, true, true); //sectionPoint가 있으면 없으면 될듯함
                    for (let w of [0,1,2,3]){
                        let slabLowerSub = [];
                        lws[w].forEach(element => slabLowerSub.push(PointToSkewedGlobal(p(element.x - B2l/2,element.y,element.z), {...girderPoint, skew : newSkew})));
                        rws[w].forEach(element => slabLowerSub.push(PointToSkewedGlobal(p(element.x + B2r/2,element.y,element.z), {...girderPoint2, skew : newSkew2})));
                        slabLowerPoints.push(slabLowerSub)
                    }
                } else if (!key.includes("TW") && !key.includes("CRX") && !key.includes("CRS")) { //&& !key.includes("CRN")
                    //xbeam이 아닌경우
                    let CRNbool = true
                    if (key.includes("CRN") && ((station >=stPointDict["CRK2"].mainStation 
                    && station <= stPointDict["CRK3"].mainStation) || (station >=stPointDict["CRK4"].mainStation 
                    && station <= stPointDict["CRK5"].mainStation))){ 
                        CRNbool = false}

                    if(CRNbool){
                        let slabLowerSub = [];
                        let lw = lowerSlabXbeam(girderPoint, stPointDict, girderBaseInfo, mainPartInput, j, 0, 1, isHaunch); //sectionPoint가 있으면 없으면 될듯함
                        let rw = lowerSlabXbeam(girderPoint2, stPointDict, girderBaseInfo, mainPartInput, j+1, 0, 1, isHaunch); //sectionPoint가 있으면 없으면 될듯함
                        lw.right0.forEach(element => slabLowerSub.push(PointToSkewedGlobal(element, girderPoint)));
                        rw.left0.forEach(element => slabLowerSub.push(PointToSkewedGlobal(element, girderPoint2)));
                        slabLowerPoints.push(slabLowerSub)
                    }
                }
            }
            dummyStation = station
        }
        deckPointDict["children"].push(new Loft(slabLowerPoints, false, "concrete", { group : group, key: "slab", part: "concrete" }))
    }
    return { deckPointDict } //{ slab1, slab2 }
}

export function lowerSlabCantil(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isHaunch = true) {
    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    let points = [];
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = PointSectionInfo2(station, skew, gridInput, girderIndex, pointDict) // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = girderBaseInfo.common.T? { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H, UL: girderBaseInfo.common.T / 2, UR: girderBaseInfo.common.T / 2 } :
    { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 }
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: - sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: - sectionInfo.UL, y: - centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = WebPoint(lwb, lwt, gradient, -topY) //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = WebPoint(rwb, rwt, gradient, -topY) //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    // let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC - w1, rw2.x + ps.uFlangeC + w1]
    let hpt = [
        { x: wx[0], y: - topY + gradient * (wx[0]) },
        lw2, 
        rw2,
        { x: wx[1], y: - topY + gradient * (wx[1]) },
    ]
    return hpt
}


export function lowerSlabOpen(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isForward) { //상부플랜지 단면변화부용

    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = PointSectionInfo2(station, skew, gridInput, girderIndex, pointDict) // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 }
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: - sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: - sectionInfo.UL, y: - centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = WebPoint(lwb, lwt, gradient, -topY) //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = WebPoint(rwb, rwt, gradient, -topY) //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1]
    // let wx = [lw2.x - ps.uFlangeC - w1, lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1]
    let hl = [];
    wx.forEach(x => hl.push(Math.abs(hh + (- gradient + girderPoint.gradientY) * x)))
    let sign = isForward? -1 : 1;
    let hpt = [
            lw2, 
            { x: wx[0], y: - topY + gradient * (wx[0]) },
            { x: wx[0] + 3 * hl[0], y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[0] + 3 * hl[0]), z : sign*3*hl[0]  },
            { x: wx[1] - 3 * hl[1], y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[1] - 3 * hl[1]), z : sign*3*hl[1]  },
            { x: wx[1], y: - topY + gradient * (wx[1]) },
            rw2
        ]
    let hpt2 = [
                lw2, 
                { x: wx[0], y: - topY + gradient * (wx[0])},
                { x: wx[0], y: - topY + gradient * (wx[0])},
                { x: wx[1], y: - topY + gradient * (wx[1])},
                { x: wx[1], y: - topY + gradient * (wx[1]) },
                rw2
            ]
    if (isForward) {
        return [hpt2, hpt]
    } else {
        return [hpt, hpt2]
    }
}


export function lowerSlabeGeneral(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, isHaunch = true) {
    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = PointSectionInfo2(station, skew, gridInput, girderIndex, pointDict) // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = girderBaseInfo.common.T? { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H, UL: girderBaseInfo.common.T / 2, UR: girderBaseInfo.common.T / 2 } :
    { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 }
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: - sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: - sectionInfo.UL, y: - centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = WebPoint(lwb, lwt, gradient, -topY) //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = WebPoint(rwb, rwt, gradient, -topY) //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC + ps.uFlangeW + w1, rw2.x + ps.uFlangeC - ps.uFlangeW - w1]
    let hl = [];

    let hpt = []; //헌치포인트
    // let wpt = []; //플렌지 돌출길이 포인트
    if (isHaunch && wx[0] < wx[1]){
        wx.forEach(x => hl.push(Math.abs(hh + (- gradient + girderPoint.gradientY) * x)))
        hpt = [
            lw2, 
            { x: wx[0], y: - topY + gradient * (wx[0]) },
            { x: wx[0] + 3 * hl[0], y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[0] + 3 * hl[0]) },
            { x: wx[1] - 3 * hl[1], y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * (wx[1] - 3 * hl[1]) },
            { x: wx[1], y: - topY + gradient * (wx[1]) },
            rw2
        ]
    } else {
        if (wx[0] >= wx[1]){
            hpt = [
                lw2, 
                { x: lw2.x + sectionInfo.B / 4, y: - topY + gradient * (lw2.x + sectionInfo.B / 4) },
                { x: lw2.x + sectionInfo.B / 4, y: - topY + gradient * (lw2.x + sectionInfo.B / 4) }, 
                { x: rw2.x - sectionInfo.B / 4, y: - topY + gradient * (rw2.x - sectionInfo.B / 4) },
                { x: rw2.x - sectionInfo.B / 4, y: - topY + gradient * (rw2.x - sectionInfo.B / 4) },
                rw2,
            ]
        } else {
            hpt = [
                lw2, 
                { x: wx[0], y: - topY + gradient * (wx[0]) },
                { x: wx[0], y: - topY + gradient * (wx[0]) },
                { x: wx[1], y: - topY + gradient * (wx[1]) },
                { x: wx[1], y: - topY + gradient * (wx[1]) },
                rw2,
            ]
        }
    }
    return hpt
}

/**
 * 바닥판 하부 가로보부 생성함수 4개의 Line으로 구성
 * @param {*} girderPoint ref Point
 * @param {*} pointDict  gridPointDict
 * @param {*} girderBaseInfo 거더 기본입력정보
 * @param {*} gridInput   거더 단면입력정보
 * @param {*} girderIndex 거더인덱스
 * @param {*} xbeamWidth 가로보의 상부플랜지 폭
 * @param {*} sec 가로보 방향과 girderPoint의 normal Vector와의 1/cos(theta) 값
 * @returns 4 * 4 array
 */
export function lowerSlabXbeam(girderPoint, pointDict, girderBaseInfo, gridInput, girderIndex, xbeamWidth, sec, isHaunch = true) { //가로보 헌치부 용

    let slabToGirder = true; // girderBaseInfo.end.isStraight;
    let station = girderPoint.mainStation;
    let isFlat = girderBaseInfo.common.isFlat;
    let gradient = isFlat ? 0 : girderPoint.gradientY;
    let skew = girderPoint.skew;
    let pointSectionInfo = PointSectionInfo2(station, skew, gridInput, girderIndex, pointDict) // slabThickness만 필요한 경우에는 흠...
    const sectionInfo = { B: girderBaseInfo.common.B, H: girderBaseInfo.end.H1, UL: girderBaseInfo.common.B / 2, UR: girderBaseInfo.common.B / 2 }
    let ps = pointSectionInfo.forward.uFlangeC < pointSectionInfo.backward.uFlangeC ? pointSectionInfo.backward : pointSectionInfo.forward;
    const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
    let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
    const lwb = { x: - sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const lwt = { x: - sectionInfo.UL, y: - centerThickness };
    const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
    const rwt = { x: sectionInfo.UR, y: -centerThickness };
    let lw2 = WebPoint(lwb, lwt, gradient, -topY) //{x:tlwX,y:gradient*tlwX - slabThickness}
    let rw2 = WebPoint(rwb, rwt, gradient, -topY) //{x:trwX,y:gradient*trwX - slabThickness}
    let w1 = girderBaseInfo.support.HaunchW; //헌치돌출길이
    let hh = ps.haunchH; //헌치높이
    let wx = [lw2.x - ps.uFlangeC - w1, lw2.x, rw2.x, rw2.x + ps.uFlangeC + w1]
    let hl = [];
    wx.forEach(x => hl.push(Math.abs(hh + (- gradient + girderPoint.gradientY) * x)))
    let hpt = [];
    let wpt = [];
    let hpt2 = [];
    let wpt2 = [];

    let dx0 = wx[0] -3 * hl[0]
    let dx1 = wx[0] 
    let dx2 = wx[3] 
    let dx3 = wx[3] +3 * hl[3]

    let z0 = (xbeamWidth / 2 + w1 + hl[0] * 3)*sec
    let z1 = (xbeamWidth / 2 + w1)*sec
    let z3 = (xbeamWidth / 2 + w1 + hl[3] * 3)*sec

    hpt.push(
         { x: dx0, y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx0, z : z0 },
         { x: dx1, y: - topY + gradient * dx1, z : z1},
         { x : lw2.x, y : lw2.y, z : z1},
         { x : rw2.x, y : rw2.y, z : z1},
         { x: dx2, y: - topY + gradient * dx2, z : z1 },
         { x: dx3, y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx3, z : z3 },
        )
    wpt.push(
        { x: dx1, y: - topY + gradient * dx1, z : z1},
        { x: dx1, y: - topY + gradient * dx1, z : z1},
        { x : lw2.x, y : lw2.y, z : z1},
        { x : rw2.x, y : rw2.y, z : z1},
        { x: dx2, y: - topY + gradient * dx2, z : z1 },
        { x: dx2, y: - topY + gradient * dx2, z : z1 },
    )
    wpt2.push(
        { x: dx1, y: - topY + gradient * dx1, z : -z1},
        { x: dx1, y: - topY + gradient * dx1, z : -z1},
        { x : lw2.x, y : lw2.y, z : -z1},
        { x : rw2.x, y : rw2.y, z : -z1},
        { x: dx2, y: - topY + gradient * dx2, z : -z1},
        { x: dx2, y: - topY + gradient * dx2, z : -z1},
    )
    hpt2.push(
        { x: dx0, y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx0, z : -z0 },
        { x: dx1, y: - topY + gradient * dx1, z : -z1},
        { x : lw2.x, y : lw2.y, z : -z1},
        { x : rw2.x, y : rw2.y, z : -z1},
        { x: dx2, y: - topY + gradient * dx2, z : -z1},
        { x: dx3, y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx3, z : -z3 },
       )
    let points = [hpt.slice(0,3), wpt.slice(0,3), wpt2.slice(0,3), hpt2.slice(0,3)]
    let points2 = [hpt.slice(3), wpt.slice(3), wpt2.slice(3), hpt2.slice(3)]

    let left0 =isHaunch? [
        { x: dx0, y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx0, z : 0 },
        { x: dx1, y: - topY + gradient * dx1, z : 0},
        { x : lw2.x, y : lw2.y, z : 0},
    ]: [
        { x: dx1, y: - topY + gradient * dx1, z : 0},
        { x: dx1, y: - topY + gradient * dx1, z : 0},
        { x : lw2.x, y : lw2.y, z : 0},
    ]
    let right0 =isHaunch? [
        { x : rw2.x, y : rw2.y, z : 0},
        { x: dx2, y: - topY + gradient * dx2, z : 0 },
        { x: dx3, y: - ps.slabThickness - girderBaseInfo.common.PavementT + girderPoint.gradientY * dx3, z : 0 },
    ]: [
        { x : rw2.x, y : rw2.y, z : 0},
        { x: dx2, y: - topY + gradient * dx2, z : 0 },
        { x: dx2, y: - topY + gradient * dx2, z : 0 },
    ]
    return {left:points, right:points2, left0, right0}
}


const barrierFn = {
    "방호벽B(좌)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: w, y: h },
        ];
    },
    "방호벽B(우)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: -w, y: h },
        ];
    },
    "사각블럭(우)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: -w, y: h },
        ];
    },
    "사각블럭(좌)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: w, y: h },
        ];
    },
    "방호벽A(좌)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: w - 190, y: h },
            { x: w - 120, y: 380 },
            { x: w, y: 200 },
        ];
    },
    "방호벽A(우)": function (w, h) {
        return [
            { x: 0, y: h },
            { x: -(w - 190), y: h },
            { x: -(w - 120), y: 380 },
            { x: -w, y: 200 },
        ];
    },
};

export function BarrierSectionPointV2(girderLayout, centerLineStations, girderBaseInfo, mainPartInput, stPointDict, barrierLayoutInput, barrierSection) {
    let deckLayout = mainPartInput.slabLayout;
    let paveT = girderBaseInfo.common.PavementT;
    let barrierLayout = [];
    barrierLayoutInput.forEach(el => barrierLayout.push({ type: el[0], from: el[1], offset: el[2] }));
    const alignment = girderLayout.alignment
    let barrierLoad = []; //[[true, 180, 200000],[false, 180, 200000]];
    let paveLoad = []; //[[true, 450, false, 450, 80]]; //반드시 첫번째행은 차선이어야 함
    let pedeLoad = [];
    for (let i = 0; i < barrierLayout.length; i++) {
        if (barrierLayout[i]["type"] === "도로포장" || barrierLayout[i]["type"] === "보도부") {
            let section = barrierSection[barrierLayout[i - 1]["type"]];
            let section2 = barrierSection[barrierLayout[i + 1]["type"]];
            let isLeft = barrierLayout[i - 1]["from"] === "슬래브좌측" ? true : false;
            let stOffset = barrierLayout[i - 1]["from"] === "슬래브좌측" ? barrierLayout[i - 1]["offset"] + section.w : barrierLayout[i - 1]["offset"];
            let isLeft2 = barrierLayout[i + 1]["from"] === "슬래브좌측" ? true : false;
            let edOffset = barrierLayout[i + 1]["from"] === "슬래브좌측" ? barrierLayout[i + 1]["offset"] : barrierLayout[i + 1]["offset"] + section2.w;
            if (barrierLayout[i]["type"] === "도로포장") {
                paveLoad.push([isLeft, stOffset, isLeft2, edOffset, paveT]);
            } else {
                //보도부의 경우에는 포장두께를 어떻게 할지 정보가 필요함
                pedeLoad.push([isLeft, stOffset, isLeft2, edOffset, paveT]);
            }
        } else {
            let section = barrierSection[barrierLayout[i]["type"]];
            let points = barrierFn[barrierLayout[i]["type"]](section.w, section.h);
            let area = 0;
            let AY = 0;
            for (let j = 0; j < points.length - 1; j++) {
                let a = ((points[j + 1].x - points[j].x) * (points[j].y + points[j + 1].y)) / 2;
                let y = points[j].x + ((points[j].y + 2 * points[j + 1].y) / (3 * points[j].y + 3 * points[j + 1].y)) * (points[j + 1].x - points[j].x);
                area += a;
                AY += a * y;
            }
            let dx = Math.abs(AY / area);
            let isLeft = barrierLayout[i]["from"] === "슬래브좌측" ? true : false;
            barrierLoad.push([isLeft, barrierLayout[i]["offset"] + dx, Math.abs(area)]);
        }
    }
    // console.log(barrierLoad, paveLoad)
    // slabLayout object to list
    // 방호벽좌, 방호벽우, 사각블럭좌, 사각블럭우, 도로포장, 보도부
    // 슬래브좌측, 슬래브우측

    let barrier = {};
    let newbarrierDict = { parent: [], children: [] };
    let pavement = {};
    let newpavementDict = { parent: [], children: [] };
    let leftOffset = deckLayout[0][3];
    let rightOffset = deckLayout[0][4];
    let LgirderLine = girderLayout.girderSplines[0];
    let RgirderLine = girderLayout.girderSplines[girderLayout.girderSplines.length - 1];
    let kLineList = [];
    for (let i = 1; i < centerLineStations.length - 1; i++) { 
        let masterPoint = centerLineStations[i].point
        if (centerLineStations[i].key.includes("CRK")){
            kLineList.push([
                IntersectionPointOnSpline(LineToOffsetSpline(LgirderLine, leftOffset), masterPoint,alignment),
                IntersectionPointOnSpline(LineToOffsetSpline(RgirderLine, rightOffset), masterPoint,alignment)
            ])
        }
    }
    let new_BarrierData = {};
    let new_PavementData = {};
    let isSlab = false;
    for (let i = 1; i < centerLineStations.length - 1; i++) {
        if (centerLineStations[i].key === "CRK0") {
            isSlab = true;
        }
        if (isSlab) {
            let masterPoint = centerLineStations[i].point;
            let masterStation = masterPoint.mainStation;
            for (let j = 0; j < deckLayout.length - 1; j++) {
                let ss = stPointDict[deckLayout[j][0]].mainStation;
                let es = stPointDict[deckLayout[j + 1][0]].mainStation;
                if (masterStation >= ss && masterStation <= es) {
                    let x = masterStation - ss;
                    let l = es - ss;
                    if (Math.abs(es-ss)<0.0001){
                      x =0;
                      l =1;
                    }
                    leftOffset = (deckLayout[j][3] * (l - x)) / l + (deckLayout[j + 1][3] * x) / l;
                    rightOffset = (deckLayout[j][4] * (l - x)) / l + (deckLayout[j + 1][4] * x) / l;
                }
            }
            let lowPt = [];
            let upperPt = [];
            let lowPt2D = [];
            let upperPt2D = [];
            let pede = [];
            let pave = [];
            let leftP = IntersectionPointOnSpline(LineToOffsetSpline(LgirderLine, leftOffset), masterPoint,alignment) //LineMatch2(masterPoint, alignment, OffsetLine(leftOffset, LgirderLine));
            let rightP = IntersectionPointOnSpline(LineToOffsetSpline(RgirderLine, rightOffset), masterPoint,alignment);
            let bool = kLineList.some(kline => Boolean(TwoLineIntersect(kline, [leftP, rightP])))

            if (!bool || centerLineStations[i].key.includes("CRK")){
                
                for (let b = 0; b < barrierLayout.length; b++) {
                    let key = barrierLayout[b]["type"] + b.toFixed(0);
                    //편경사가 변화하는 경우를 고려하여 기준점을 계속 생성하면서 단면 생성함
                    if (barrierSection.hasOwnProperty(barrierLayout[b]["type"])) {
                        if (!barrier.hasOwnProperty(key)) {
                            barrier[key] = { type: "loft", points: [], gridPoint: [], closed: false };
                            new_BarrierData[key] = new Loft([], true, "concrete", { key: "barrier", part: key })
                        }
                        let section = barrierSection[barrierLayout[b]["type"]];
                        section["points"] = barrierFn[barrierLayout[b]["type"]](section.w, section.h);
                        let pts = [];
                        if (barrierLayout[b]["from"] === "슬래브좌측") {
                            let lLine1 = LineToOffsetSpline(LgirderLine, leftOffset + barrierLayout[b]["offset"]);
                            let lLine2 = LineToOffsetSpline(LgirderLine, leftOffset + barrierLayout[b]["offset"] + section.w);
                            let l1 = IntersectionPointOnSpline(lLine1, masterPoint, alignment);
                            let l2 = IntersectionPointOnSpline(lLine2, masterPoint, alignment);
                            pts.push(PointToSkewedGlobal({x : 0, y : - paveT, z: 0}, l1));
                            section.points.forEach(pt => pts.push(PointToSkewedGlobal({x : pt.x, y : pt.y - paveT, z: 0}, l1)));
                            pts.push(PointToSkewedGlobal({x : 0, y : - paveT, z: 0}, l2));
                            let sectionPt = [{ x: l1.offset, y: l1.z - masterPoint.z - paveT }];
                            section.points.forEach(pt => sectionPt.push({ x: l1.offset + pt.x, y: l1.z - masterPoint.z + pt.y }));
                            sectionPt.push({ x: l2.offset, y: l2.z - masterPoint.z  - paveT});

                            lowPt.push(pts[0], pts[pts.length - 1]);
                            upperPt.push(pts[1], pts[pts.length - 2]);
                            lowPt2D.push(sectionPt[0], sectionPt[sectionPt.length - 1]);
                            upperPt2D.push(sectionPt[1], sectionPt[sectionPt.length - 2]);
                            new_BarrierData[key].points.push(pts);
                        } else {
                            //슬래브 우측인경우
                            let rLine1 = LineToOffsetSpline(RgirderLine, rightOffset - barrierLayout[b]["offset"]);
                            let rLine2 = LineToOffsetSpline(RgirderLine, rightOffset - barrierLayout[b]["offset"] - section.w);
                            let l1 = IntersectionPointOnSpline(rLine1, masterPoint, alignment);
                            let l2 = IntersectionPointOnSpline(rLine2, masterPoint, alignment);;

                            pts.push(PointToSkewedGlobal({x : 0, y : - paveT, z: 0}, l1));
                            section.points.forEach(pt => pts.push(PointToSkewedGlobal({x : pt.x, y : pt.y - paveT, z: 0}, l1)));
                            pts.push(PointToSkewedGlobal({x : 0, y : - paveT, z: 0}, l2));

                            let sectionPt = [{ x: l1.offset, y: l1.z - masterPoint.z - paveT}];
                            section.points.forEach(pt => sectionPt.push({ x: l1.offset + pt.x, y: l1.z - masterPoint.z + pt.y }));
                            sectionPt.push({ x: l2.offset, y: l2.z - masterPoint.z - paveT});

                            lowPt.push(pts[pts.length - 1], pts[0]);
                            upperPt.push(pts[pts.length - 2], pts[1]);
                            lowPt2D.push(sectionPt[sectionPt.length - 1], sectionPt[0]);
                            upperPt2D.push(sectionPt[sectionPt.length - 2], sectionPt[1]);
                            new_BarrierData[key].points.push(pts);
                        }
                    } else if (barrierLayout[b]["type"].includes("보도")) {
                        //보도부
                        if (!pavement.hasOwnProperty(key)) {
                            pavement[key] = { type: "loft", points: [], cap: true, closed: true };
                            new_PavementData[key] = new Loft([], true, "pavement", { key: "pavement", part: key })
                        }
                        if (barrierLayout[b]["from"] === "슬래브좌측") {
                            pede.push({ key, isLeft: false, slope: barrierLayout[b]["offset"], index: lowPt.length - 1 });
                        } else {
                            //슬래브 우측기준
                            pede.push({ key, isLeft: true, slope: barrierLayout[b]["offset"], index: lowPt.length - 1 });
                        }
                    } else {
                        //포장부
                        if (!pavement.hasOwnProperty(key)) {
                            pavement[key] = { type: "loft", points: [], cap: true, ptGroup: [], closed: false };
                            new_PavementData[key] = new Loft([], true, "pavement", { key: "pavement", part: key })
                        }
                        pave.push({ key, index: lowPt.length - 1 });
                    }
                }
                for (let p in pede) {
                    let pts, pts2D;
                    let dz = (Math.abs(lowPt[pede[p].index].offset - lowPt[pede[p].index + 1].offset) * pede[p].slope) / 100;
                    if (pede[p].isLeft) {
                        pts = [
                            lowPt[pede[p].index],
                            upperPt[pede[p].index],
                            { x: upperPt[pede[p].index + 1].x, y: upperPt[pede[p].index + 1].y, z: upperPt[pede[p].index].z + dz },
                            lowPt[pede[p].index + 1],
                        ];
                        pts2D = [lowPt2D[pede[p].index], upperPt2D[pede[p].index], { x: upperPt2D[pede[p].index + 1].x, y: upperPt2D[pede[p].index].y + dz }, lowPt2D[pede[p].index + 1]];
                    } else {
                        pts = [
                            lowPt[pede[p].index],
                            { x: upperPt[pede[p].index].x, y: upperPt[pede[p].index].y, z: upperPt[pede[p].index + 1].z + dz },
                            upperPt[pede[p].index + 1],
                            lowPt[pede[p].index + 1],
                        ];
                        pts2D = [lowPt2D[pede[p].index], { x: upperPt2D[pede[p].index].x, y: upperPt2D[pede[p].index + 1].y + dz }, upperPt2D[pede[p].index + 1], lowPt2D[pede[p].index + 1]];
                    }
                    new_PavementData[pede[p].key].points.push(pts.reverse());
                }
                for (let p in pave) {
                    let pts, pts2D;
                    if (lowPt[pave[p].index].offset * lowPt[pave[p].index + 1].offset < 0) {
                        pts = [
                            lowPt[pave[p].index],
                            { x: lowPt[pave[p].index].x, y: lowPt[pave[p].index].y, z: lowPt[pave[p].index].z + paveT },
                            { x: masterPoint.x, y: masterPoint.y, z: masterPoint.z },
                            { x: lowPt[pave[p].index + 1].x, y: lowPt[pave[p].index + 1].y, z: lowPt[pave[p].index + 1].z + paveT },
                            lowPt[pave[p].index + 1],
                        ];
                        pts2D = [
                            lowPt2D[pave[p].index],
                            { x: lowPt2D[pave[p].index].x, y: lowPt2D[pave[p].index].y + paveT },
                            { x: 0, y: 0 },
                            { x: lowPt2D[pave[p].index + 1].x, y: lowPt2D[pave[p].index + 1].y + paveT },
                            lowPt2D[pave[p].index + 1],
                        ];
                    } else {
                        pts = [
                            lowPt[pave[p].index],
                            { x: lowPt[pave[p].index].x, y: lowPt[pave[p].index].y, z: lowPt[pave[p].index].z + paveT },
                            { x: lowPt[pave[p].index + 1].x, y: lowPt[pave[p].index + 1].y, z: lowPt[pave[p].index + 1].z + paveT },
                            lowPt[pave[p].index + 1],
                        ];
                        pts2D = [
                            lowPt2D[pave[p].index],
                            { x: lowPt2D[pave[p].index].x, y: lowPt2D[pave[p].index].y + paveT },
                            { x: lowPt2D[pave[p].index + 1].x, y: lowPt2D[pave[p].index + 1].y + paveT },
                            lowPt2D[pave[p].index + 1],
                        ];
                    }
                    new_PavementData[pave[p].key].points.push(pts.reverse());
                }
            }
        }
        if (centerLineStations[i].key === "CRK7") {
            isSlab = false;
        }
    }
    for (let i in new_BarrierData) {
        newbarrierDict["children"].push(new_BarrierData[i]);
    }
    for (let i in new_PavementData) {
        newpavementDict["children"].push(new_PavementData[i]);
    }
    return { newbarrierDict, newpavementDict, barrierLoad, paveLoad, pedeLoad };
}