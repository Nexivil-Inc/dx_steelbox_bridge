import { IntersectionPointOnSpline, LineToOffsetSpline, Loft, MainPointGenerator, p, PointToGlobal, PointToSkewedGlobal, Rebar, TwoLineIntersect, TwoPointsLength, WebPoint } from "@nexivil/package-modules";
import { concToRebarOffset, DivideRebarSpacing, LoftCutBySpline, RebarPointGen } from "@nexivil/package-modules/src/temp";
import { PointSectionInfo2 } from "./context";


export function CPBDeckPart(
    girderLayout,
    stPointDict,
    centerLineStations,
    girderStation,
    sectionPointDict,
    girderBaseInfo,
    mainPartInput,
    xbeamGrid,
    deckPartInput
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
    )
    console.log(deckPartInput.barrierLayoutInput, deckPartInput.barrierSection)
    let barrier = BarrierSectionPointV2(girderLayout, centerLineStations, girderBaseInfo, mainPartInput, stPointDict, deckPartInput.barrierLayoutInput, deckPartInput.barrierSection)
    console.log(barrier)
    return [ ...deckModel.deckPointDict['children'], ...barrier.newbarrierDict['children'], ...barrier.newpavementDict['children']]
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
            // let leftgirderPoint = IntersectionPointOnSpline(LgirderLine, mainPoint, alignment);
            // let rightgirderPoint = IntersectionPointOnSpline(RgirderLine, mainPoint, alignment);

            for (let j = 0; j < slabLayout.length - 1; j++) { //upperSlabPoint에 대한 함수화 예정
                let ss = stPointDict[slabLayout[j][position]].mainStation;
                let es = stPointDict[slabLayout[j + 1][position]].mainStation;
                if (station >= ss && station <= es) {
                    let x = station - ss;
                    let l = es - ss;
                    // let lcos = (mainPoint.normalCos * leftgirderPoint.normalCos + mainPoint.normalSin * leftgirderPoint.normalSin); // 사각에 곡선일 경우 각도차이 보정
                    // let rcos = (mainPoint.normalCos * rightgirderPoint.normalCos + mainPoint.normalSin * rightgirderPoint.normalSin); // 사각에 곡선일 경우 각도차이 보정
                    // leftOffset = (slabLayout[j][3] * (l - x) / l + slabLayout[j + 1][3] * (x) / l) / lcos + leftgirderPoint.offset;
                    // rightOffset = (slabLayout[j][4] * (l - x) / l + slabLayout[j + 1][4] * (x) / l) / rcos + rightgirderPoint.offset;
                    leftOffset2 = slabLayout[j][3] * (l - x) / l + slabLayout[j + 1][3] * (x) / l;
                    rightOffset2 = slabLayout[j][4] * (l - x) / l + slabLayout[j + 1][4] * (x) / l;
                    // slabThickness = slabLayout[j][H] * (l - x) / l + slabLayout[j + 1][H] * (x) / l;
                    // endT = slabLayout[j][T] * (l - x) / l + slabLayout[j + 1][T] * (x) / l;
                    // haunch = slabLayout[j][5]; //헌치의 변화에 따른 경계면에 대한 솔루션이 필요함
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
    
    // let slabUpperLoft = []; //상면만 포함함
    // let leftBorder = [];
    // let rightBorder = [];
    // let leftCantil = [];
    // let rightCantil = [];
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
                //block에 대한 loft객체 생성 필요
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
                    // slabUpperLoft.push(slabUpperPoints.slice(3,6))
                    // leftBorder.push(leftPoint);
                    // rightBorder.push(rightPoint);
                    // leftCantil.push(slabUpperPoints.slice(0,4).reverse())
                    // rightCantil.push(slabUpperPoints.slice(-4).reverse())
                    slabUpperAll.push(slabUpperPoints)
                    if(key.includes("K0")){
                        startCap.push(...slabUpperPoints.slice().reverse())
                    }
                    if(key.includes("K7")){
                        endCap.push(...slabUpperPoints.slice().reverse())
                    }
                    if (a>0){
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
    let rightOffset = deckLayout[deckLayout.length - 1][3];
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
            let section2DBarrier = { part: centerLineStations[i].key, model: { sectionView: [] }, dimension: { topView: [], sectionView: [] } }; // parent data
            let section2DPavement = { part: centerLineStations[i].key, model: { sectionView: [] } }; // parent data
            if (!bool || centerLineStations[i].key.includes("CRK")){
                
                for (let b = 0; b < barrierLayout.length; b++) {
                    let key = barrierLayout[b]["type"] + b.toFixed(0);
                    //편경사가 변화하는 경우를 고려하여 기준점을 계속 생성하면서 단면 생성함
                    if (barrierSection.hasOwnProperty(barrierLayout[b]["type"])) {
                        if (!barrier.hasOwnProperty(key)) {
                            barrier[key] = { type: "loft", points: [], gridPoint: [], closed: false };
                            new_BarrierData[key] = new Loft([], true, "concrete", { key: "barrier", part: key })
                            // {
                            //     type: "loft",
                            //     points: [],
                            //     gridPoint: [],
                            //     closed: false,
                            //     meta: { key: "barrier", part: key },
                            //     get threeFunc() {
                            //         return InitPoint => LoftModelView(this.points, this.closed, this.cap, this.ptGroup, InitPoint);
                            //     },
                            // };
                        }
                        let section = barrierSection[barrierLayout[b]["type"]];
                        section["points"] = barrierFn[barrierLayout[b]["type"]](section.w, section.h);
                        let pts = [];
                        // let geo = new THREE.Geometry();
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

                            // section2DBarrier["model"]["sectionView"].push({ sectionName: key, ...ToLine(sectionPt, "WHITE", false) });
                            // section2DBarrier["dimension"]["topView"].push({ sectionName: key, points: [pts[0], pts[pts.length - 1]] });
                            // section2DBarrier["dimension"]["sectionView"].push({ x: l1.offset, y: 0 }, { x: l2.offset, y: 0 });
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

                            // section2DBarrier["model"]["sectionView"].push({ sectionName: key, ...ToLine(sectionPt, "WHITE", false) });
                            // section2DBarrier["dimension"]["topView"].push({ sectionName: key, points: [pts[pts.length - 1], pts[0]] });
                            // section2DBarrier["dimension"]["sectionView"].push({ x: l2.offset, y: 0 }, { x: l1.offset, y: 0 });
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
                    // section2DPavement["model"]["sectionView"].push(ToLine(pts2D, "GRAY", false));
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
                            // masterPoint,
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
                    // section2DPavement["model"]["sectionView"].push(ToLine(pts2D, "GRAY", false));
                }

                // newbarrierDict["parent"].push(section2DBarrier);
                // newpavementDict["parent"].push(section2DPavement);
            }
        }
        if (centerLineStations[i].key === "CRK7") {
            isSlab = false;
        }
    }
    //곡률이 과다한 경우 리스트의 순서가 바뀔 우려가 있음 210128 by drlim
    // leftBarrier.sort(function (a, b) { return a.name < b.name ? -1 : 1; })
    // rightBarrier.sort(function (a, b) { return a.name < b.name ? -1 : 1; })
    for (let i in new_BarrierData) {
        newbarrierDict["children"].push(new_BarrierData[i]);
    }
    for (let i in new_PavementData) {
        newpavementDict["children"].push(new_PavementData[i]);
    }
    return { newbarrierDict, newpavementDict, barrierLoad, paveLoad, pedeLoad };
}


export function SlabRebarFn(deckPointDict, girderLayout, gridPointDict, deckPartInput){
    let rebarDict = []; // children만들지 않음, parent 필요없음 검증
    let input = deckPartInput.transRebar //횡철근
    // {
    //     "cover": {
    //         "top": 50,
    //         "side": 50,
    //         "bottom": 55
    //     },
    //     "endctc": 250,
    //     "centerctc": 250,
    //     "endUpperRebarDia": "H22",
    //     "endLowerRebarDia": "H16",
    //     "centerUpperRebarDia": "H16",
    //     "centerLowerRebarDia": "H16"
    // }
    let inputT =  deckPartInput.longiRebar //횡철근
    // { //종철근
    //     "cover": {
    //         "top": 50,
    //         "side": 50,
    //         "bottom": 55
    //     },
    //     "endctc": 250,
    //     "centerctc": 250,
    //     "supportctc": 250,
    //     "supportRebarLength" : 20000,
    //     "endRebarLength" : 7000,
    //     "endUpperRebarDia": "H16",
    //     "endLowerRebarDia": "H16",
    //     "centerUpperRebarDia": "H16",
    //     "centerLowerRebarDia": "H16",
    //     "supportUpperRebarDia": "H19",
    //     "supportLowerRebarDia": "H19"
    // }
    let ri = { //rebar info
        "1" : { dia : input.endUpperRebarDia??"H25", id : "rType7", name : "endUpper"},
        "1-1" : { dia : input.endUpperRebarDia??"H25", id : "rType7", name : "endSkewUpper"},
        "2" : { dia : input.centerUpperRebarDia??"H25", id : "rType7", name : "centerUpper"},
        "4" : { dia : input.centerLowerRebarDia??"H25", id : "rType1", name : "boxBottom"},
        "4-1" : { dia : input.centerLowerRebarDia??"H25", id : "rType2", name : "boxBottom2"},
        "4-2" : { dia : input.centerLowerRebarDia??"H25", id : "rType2", name : "plateBottom"},
        "3" : { dia : input.centerLowerRebarDia??"H25", id :"rType8", name : "boxCantil"},
        "3-1" : { dia : input.centerLowerRebarDia??"H25", id : "rType9", name : "boxCantil2"},
        "3-2" : { dia : input.centerLowerRebarDia??"H25", id :"rType8", name : "plateCantil"},
        "9" : { dia : input.centerLowerRebarDia??"H25", id :"rType10", name : "boxhaunch"},
        "9-1" : { dia : input.centerLowerRebarDia??"H25", id :"rType10", name : "platehaunch"},

        "10" : { dia : inputT.endLowerRebarDia??"H25", id : "rType6", name : "endLowerRebar"},
        "11" : { dia : inputT.endUpperRebarDia??"H25", id : "rType3", name : "endUpperRebar"},
        "C1" : { dia : "H25", id : "rType10", name : "crossHaunch"},
        "5" : { dia : inputT.centerUpperRebarDia??"H32", id :"rType2", name : "centerUpperRebar"},
        "6" : { dia : inputT.centerLowerRebarDia??"H32", id :"rType2", name : "centerLowerRebar"},
        "7" : { dia : inputT.supportUpperRebarDia??"H32", id :"rType2", name : "supportUpperRebar"},
        "8" : { dia : inputT.supportLowerRebarDia??"H32", id :"rType2", name : "supportLowerRebar"},
    }

       
    // 기존코드 컨버팅용 시작
    const girderNum = girderLayout.girderCount;
    const supportNum = girderLayout.supportCount - 2;
    let alignment = girderLayout.alignment;
    let deckModel = new Loft("concrete", "slabUpper", "concrete",deckPointDict["children"][0].points, false, )
    let girderDeckList = [];
    let crossDeckList = [];
    for (let i = 0; i<girderNum;i++){
        let key = "slab" + String(i+1)
        let bottomDeck = deckPointDict["children"].find( function(arr){ return arr.meta.key === key} )
        girderDeckList.push(new Loft("concrete", key, "concrete", bottomDeck.points,  false))
    }
    for (let i = 0; i<girderNum+1;i++){
        let key = "slab" + String(i) + "-" +String(i+1)
        let bottomDeck = deckPointDict["children"].find( function(arr){ return arr.meta.key === key} )
        crossDeckList.push(new Loft("concrete", key, "concrete", bottomDeck.points,  false))
    }

    // console.log(alignment, deckModel, deckModel.meta)
    let stk0 = gridPointDict["CRK0"].mainStation
    let skewk0 = gridPointDict["CRK0"].skew
    let stk7 = gridPointDict["CRK7"].mainStation
    let skewk7 = gridPointDict["CRK7"].skew
    let stk3 = gridPointDict["CRK3"].mainStation
    let skewk3 = gridPointDict["CRK3"].skew
    let stk4 = gridPointDict["CRK4"].mainStation
    let skewk4 = gridPointDict["CRK4"].skew
    // console.log(deckPointDict.upperDict)
    // let k1l = deckModel.points[0][2]
    // let k1r = deckModel.points[0][6]
    // let k6l = deckModel.points[deckModel.points.length-1][2]
    // let k6r = deckModel.points[deckModel.points.length-1][6]
    let leftK1 = deckPointDict.upperDict["CRK1"].leftPoint;
    let rightK1 = deckPointDict.upperDict["CRK1"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k1r))
    let leftK6 = deckPointDict.upperDict["CRK6"].leftPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6l))
    let rightK6 = deckPointDict.upperDict["CRK6"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6r))
    // 기존코드 컨버팅용 끝

    let start = Math.max(leftK1.mainStation, rightK1.mainStation);
    let end = Math.min(leftK6.mainStation, rightK6.mainStation);
    let stList = DivideRebarSpacing(start+100, end-100, input.centerctc, 0);
    for (let st of stList){
        let stPoint = MainPointGenerator(st, alignment,0);
        let upperSection = LoftCutByPoint(deckModel.points,stPoint, true);
        let allSection = upperSection.slice(0).reverse();
        for (let i = 0; i<girderNum+1;i++){
            allSection.push(...LoftCutByPoint(crossDeckList[i].points, stPoint, true).slice(1,-1))
            if (i<girderNum){
                allSection.push(...LoftCutByPoint(girderDeckList[i].points,stPoint, true).slice(1,-1))
            }
        }
        let rSection = RebarPointGen(allSection, input.cover.top, input.cover.side, input.cover.bottom)
        let upperRebar = [rSection[rSection.length-1], ...rSection.slice(0,4)]


        rebarDict.push(new Rebar("상부주철근", "1", input.centerUpperRebarDia, PointToGlobal(upperRebar, stPoint), ri, {a:100}))
        rebarDict.push(...MainBottomRebarGenV2(rSection, ri, stPoint))
    }
    let SkewNum1 =  Math.floor(Math.abs(leftK1.mainStation - rightK1.mainStation)/input.endctc)
    if (SkewNum1>0){ //시점부 사각철근
        let sec1 = 1/Math.cos(skewk0);
        let k0 = MainPointGenerator(stk0, alignment, skewk0);
        for (let n = 0; n<SkewNum1 + 2;n++){
            let dst = sec1*input.cover.side + n*input.endctc;
            let stPoint = StPointToParallel(k0, dst, alignment);
            let refP = toRefPoint(stPoint,true);
            let upperSection = LoftCutByPoint(deckModel.points,refP, true);
            let allSection = upperSection.slice(0).reverse();
            for (let i = 0; i<girderNum+1;i++){
                allSection.push(...LoftCutByPoint(crossDeckList[i].points, refP, true).slice(1,-1))
                if (i<girderNum){
                    allSection.push(...LoftCutByPoint(girderDeckList[i].points,refP, true).slice(1,-1))
                }
            }
            let rSection = RebarPointGen(allSection, input.cover.top, input.cover.side, input.cover.bottom);
            let upperRebar = [rSection[rSection.length-1], ...rSection.slice(0,4)];
            rebarDict.push(new Rebar("상부주철근", "1-1",input.endUpperRebarDia, PointToGlobal(upperRebar, refP), ri, {a:100}))
            rebarDict.push(...MainBottomRebarGenV2(rSection, ri, refP))
        }
    }
    let SkewNum2 =  Math.floor(Math.abs(leftK6.mainStation - rightK6.mainStation)/input.endctc)
    if (SkewNum2>0){ //종점부 사각철근
        let sec2 = 1/Math.cos(skewk7);
        let k7 = MainPointGenerator(stk7, alignment, skewk7);
        for (let n = 0; n<SkewNum2 + 2;n++){
            let dst = -sec2*input.cover.side - n*input.endctc;
            let stPoint = StPointToParallel(k7, dst, alignment);
            let refP = toRefPoint(stPoint,true);
            let upperSection = LoftCutByPoint(deckModel.points,refP, true);
            let allSection = upperSection.slice(0).reverse();
            for (let i = 0; i<girderNum+1;i++){
                allSection.push(...LoftCutByPoint(crossDeckList[i].points, refP, true).slice(1,-1))
                if (i<girderNum){
                    allSection.push(...LoftCutByPoint(girderDeckList[i].points,refP, true).slice(1,-1))
                }
            }
            let rSection = RebarPointGen(allSection, input.cover.top, input.cover.side, input.cover.bottom);
            let upperRebar = [rSection[rSection.length-1], ...rSection.slice(0,4)];
            rebarDict.push(new Rebar("상부주철근", "1-1", input.endUpperRebarDia, PointToGlobal(upperRebar, refP), ri, {a:100}))
            rebarDict.push(...MainBottomRebarGenV2(rSection, ri, refP))
        }
    }
    let leftOffset = deckPointDict.upperDict["CRK1"].leftPoint.offset + input.cover.side
    let rightOffset = deckPointDict.upperDict["CRK1"].rightPoint.offset - input.cover.side
    let offsetList = DivideRebarSpacing(leftOffset, rightOffset, inputT.endctc)
    for (let off of offsetList){
        //곡교일 경우 station이 교차할 수 있음
        let sliceLine = new Spline(OffsetLine(off, alignment.points)) //, gridPointDict["CRK1"], gridPointDict["CRK6"]
        let Section = LoftCutBySpline(deckModel.points, sliceLine.points, false, false);
        let topCount = Section.length;
        let bottomCount = 0;
        Section.sort(function(a,b){return a.station<b.station?-1:1}) //단면이 교차하여 역전되는 현상이 있음
        for (let bottomDeck of [...crossDeckList,...girderDeckList]){
            let bSection = LoftCutBySpline(bottomDeck.points, sliceLine.points, false, false);
            if(bSection.length>0){
                bSection.sort(function(a,b){return a.station<b.station?-1:1}) //단면이 교차하여 역전되는 현상이 있음
                bottomCount = bSection.length;
                Section.push(...bSection.reverse())
                break;
            }
        }
        let cover = [];
        let ptCount = topCount+bottomCount;
        for (let c = 0; c < ptCount; c++) {
            if (c === ptCount - 1 || c === topCount-1) {
                cover.push(input.cover.side);
            } else if (c < topCount-1) {
                cover.push(input.cover.top);
            } else {
                cover.push(input.cover.bottom);
            }
        }
        let sideSection = [];
        Section.forEach(pt=> sideSection.push(new Point(pt.station, pt.z, 0)))
        let rSection = concToRebarOffset(sideSection, cover, true, true)//사각을 고려하여 측면의 피복을 변화시켜야함
        rebarDict.push(...transRebarGen(rSection, topCount, ri, sliceLine.points, gridPointDict, inputT, supportNum))
    }
    return { "children" : rebarDict, "rebarInfo" : ri, input, inputT }
}

export function MainBottomRebarGenV2(rebar, ri, stPoint, isLocal = false) {
    let boxBottom = []; //하부철근
    let boxBottom2 = []; //헌치가 없는 경우 하부철근
    let plateBottom = [];
    let boxCantil = [];
    let boxCantil2 = []; //헌치가 없는 경우
    let plateCantil = [];
    let boxhaunch = [];
    let platehaunch = [];
    let bottomPoint = []; //하부철근
    let l1 = rebar.slice(0, 3);
    for (let index = 3; index < rebar.length; index += 8) {
        let l2 = rebar.slice(index, index + 8); //헌치부 판단변수
        let p1 = null;
        let p2 = null;
        let p3 = null;
        let p4 = null;
        p1 = multiLineIntersect(l1, l2.slice(0, 2), true, true);
        p2 = multiLineIntersect(l1, l2.slice(2, 4), true, true);
        p3 = multiLineIntersect(l1, l2.slice(4, 6), true, true);
        p4 = multiLineIntersect(l1, l2.slice(6), true, true);
        let isBox = isNaN(p2.x) && isNaN(p3.x); //오류발생원인 파악 필요

        if (index === 3) {
            //첫번째 거더
            if (isBox) {
                //박스부인경우
                if (isNaN(p4.x)) {
                    boxCantil2.push([l1[2], l2[0], l2[1], l2[6]]);
                } else {
                    boxCantil.push([l1[2], l2[0], l2[1], l2[6], p4]);
                }
            } else {
                //플레이트부인경우
                plateCantil.push([l1[2], l2[0], l2[1], l2[2], p2]);
                platehaunch.push([p3, l2[5], l2[6], p4]);
            }
        } else if (index === rebar.length - 8) {
            //마지막 거더
            if (isBox) {
                //박스부인경우
                if (isNaN(p1.x)) {
                    boxCantil2.push([l1[0], l2[7], l2[6], l2[1]]);
                } else {
                    boxCantil.push([l1[0], l2[7], l2[6], l2[1], p1]);
                }
            } else {
                //플레이트부인경우
                plateCantil.push([l1[0], l2[7], l2[6], l2[5], p3]);
                platehaunch.push([p1, l2[1], l2[2], p2]);
            }
        } else {
            platehaunch.push([p1, l2[1], l2[2], p2]);
            platehaunch.push([p3, l2[5], l2[6], p4]);
            boxhaunch.push([p1, l2[1], l2[6], p4]);
        }
        

        if (index > 3) {
            bottomPoint.push(l2[0]);
            if (isBox) {
                //박스부인경우
                if (!isNaN(p1.x)) {
                    // 단부/가로보가 아닌 경우
                    boxBottom.push(bottomPoint);
                    bottomPoint = [];
                }
            }
        }
        if (!isBox) {
            // 플레이트거더부인 경우
            bottomPoint.push(l2[3], l2[4]);
        }
        if (index + 8 < rebar.length) {
            bottomPoint.push(l2[7]);
        } else {
            //마지막거더의 경우
            if (isBox) {
                //박스부인경우
                if (isNaN(p1.x)) {
                    // 단부/가로보의 경우
                    boxBottom2.push(bottomPoint);
                }
            } else {
                //플레이트부인경우
                plateBottom.push(bottomPoint);
            }
        }
    }

    for (let i in boxBottom) {
        boxBottom[i].unshift(ExtendPoint2D(boxBottom[i][1], boxBottom[i][0], 400));
        boxBottom[i].push(ExtendPoint2D(boxBottom[i][boxBottom[i].length - 2], boxBottom[i][boxBottom[i].length - 1], 400));
    }
    for (let i in plateBottom) {
        plateBottom[i].unshift(ExtendPoint2D(plateBottom[i][1], plateBottom[i][0], 400));
        plateBottom[i].push(ExtendPoint2D(plateBottom[i][plateBottom[i].length - 2], plateBottom[i][plateBottom[i].length - 1], 400));
    }
    let rebarDict = [];
    if (isLocal){
        boxBottom.forEach(pts=> {if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "4", ri["4"].dia, pts, ri, {a:100}))})
        boxBottom2.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "4-1", ri["4-1"].dia, pts, ri, {a:100}))})
        plateBottom.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "4-2", ri["4-2"].dia, pts, ri, {a:100}))})
        boxCantil.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "3", ri["3"].dia, pts, ri, {a:100}))})
        boxCantil2.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "3-1", ri["3-1"].dia, pts, ri, {a:100}))})
        plateCantil.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "3-2", ri["3-2"].dia, pts, ri, {a:100}))})
        boxhaunch.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "9", ri["9"].dia, pts, ri, {a:100}))})
        platehaunch.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "9-1", ri["9-1"].dia, pts, ri, {a:100}))})
    } else {
        boxBottom.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "4", ri["4"].dia, PointToGlobal(pts, stPoint), ri, {a:100}))})
        boxBottom2.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "4-1", ri["4-1"].dia, PointToGlobal(pts, stPoint), ri, {a:100}))})
        plateBottom.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "4-2", ri["4-2"].dia, PointToGlobal(pts, stPoint), ri, {a:100}))})
        boxCantil.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "3", ri["3"].dia, PointToGlobal(pts, stPoint), ri, {a:100}))})
        boxCantil2.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "3-1", ri["3-1"].dia, PointToGlobal(pts, stPoint), ri, {a:100}))})
        plateCantil.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "3-2", ri["3-2"].dia, PointToGlobal(pts, stPoint), ri, {a:100}))})
        boxhaunch.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "9", ri["9"].dia, PointToGlobal(pts, stPoint), ri, {a:100}))})
        platehaunch.forEach(pts=>{if(PolyLineLength(pts)) rebarDict.push(new Rebar("하부주철근", "9-1", ri["9-1"].dia, PointToGlobal(pts, stPoint), ri, {a:100}))})
    }
    // return { boxBottom, boxBottom2, plateBottom, boxCantil, boxCantil2, plateCantil, boxhaunch, platehaunch };
    return rebarDict
}


function transRebarGen(rebarSection, topCount, ri, sliceLinePoints, gridPointDict, inputT, supportNum) {
    let err = 0.1
    let gradCr = 0.15
    let top = rebarSection.slice(0, topCount);
    let bottom = rebarSection.slice(topCount).reverse();
    let rIndex = 0;
    let lowerRebars = [[bottom[0]]];
    let supportStation = [];
    for (let i = 2; i<supportNum;i++){
        let key = "CRS"+String(i)
        let newP = LineMatch2(gridPointDict[key], null,sliceLinePoints)
        supportStation.push(newP.station); //위치확인필요, 종단면도 작도시 확인바람!
    }
    for (let i = 0; i < bottom.length - 1; i++) {
        let p1 = bottom[i];
        let p2 = bottom[i+1];
        let dx = p2.x - p1.x
        let dy = p2.y - p1.y
        if (dx> err){
            if (dy/dx< -gradCr){ //바닥판 두께변화구간에, 헌치철근이 절점 3개이상으로 이어질 경우, 오류발생
                let p3 = multiLineIntersect(top, [p1,p2], true, true);
                lowerRebars.push([])
                rIndex++
                lowerRebars[rIndex].push(p3)
                lowerRebars[rIndex].push(p2)
            } else if (dy/dx>gradCr){
                let p4 = multiLineIntersect(top, [p1,p2], true, true);
                lowerRebars[rIndex].push(p4)
                lowerRebars.push([])
                rIndex++
                lowerRebars[rIndex].push(p2)
            } else {
                lowerRebars[rIndex].push(p2)
            }
        }
    }
    let rebarDict = [];
    let straightRebars = [];
    let overLapEndL = Math.max(overLap[inputT.endLowerRebarDia],overLap[inputT.centerLowerRebarDia])
    let overLapSupportL = Math.max(overLap[inputT.supportLowerRebarDia],overLap[inputT.centerLowerRebarDia])

    for (let i = 0; i<lowerRebars.length;i++){
        if(i===0){ //시점 하부철근 굽힘
            lowerRebars[i].unshift(top[0])
            lowerRebars[i].unshift(ExtendPoint2D(top[2], top[0], -500))
            let rSection = lowerRebars[i]
            let pts = SplineToGlobal(rSection, sliceLinePoints)
            console.log("check", PolyLineLength(pts), rSection)
            rebarDict.push(new Rebar("하부배력철근", "10", ri["10"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100}))
        } else if(i===lowerRebars.length-1){//종점 하부철근 굽힘
            lowerRebars[i].push(top[top.length-1])
            lowerRebars[i].push(ExtendPoint2D(top[top.length-3], top[top.length-1], -500))
            let rSection = lowerRebars[i]
            let pts = SplineToGlobal(rSection, sliceLinePoints)
            console.log("check", PolyLineLength(pts), rSection)
            rebarDict.push(new Rebar("하부배력철근", "10", ri["10"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100}))


        } else if(lowerRebars[i].length>1){
            let p1 = lowerRebars[i][0];
            let p2 = lowerRebars[i][1];
            let p3 = lowerRebars[i][lowerRebars[i].length-2];
            let p4 = lowerRebars[i][lowerRebars[i].length-1];
            let dx = p2.x - p1.x
            let dy = p2.y - p1.y
            let dx2 = p4.x - p3.x
            let dy2 = p4.y - p3.y
            if(Math.abs(dy/dx)>gradCr && Math.abs(dy2/dx2)>gradCr){ //양측이 헌치인 경우
                if (Math.abs(p3.x - p2.x) < 1000){ //헌치간격이 좁은 경우, 가로보라고 판단함, 
                    let rSection = lowerRebars[i]
                    if (rSection.length>3){//오류철근 포함방지용
                        rebarDict.push(new Rebar("가로보철근", "C1", ri["C1"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100}))
                    }
                } else { //박스구간 하면 헌치 철근
                    let rSection = lowerRebars[i] 
                    if (rSection.length>3){//오류철근 포함방지용!!
                        rebarDict.push(new Rebar("하부배력철근", "8", ri["8"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100}))                    
                    }
                } 
            } else if(Math.abs(dy/dx)>gradCr){
                //둘중에 앞부분이 헌치인 경우
                let rSection = [... lowerRebars[i], ExtendPoint2D(lowerRebars[i][lowerRebars[i].length-2], lowerRebars[i][lowerRebars[i].length-1], overLapEndL)]
                    rebarDict.push(new Rebar("상부배력철근", "7", ri["7"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100}))                    
            } else if(Math.abs(dy2/dx2)>gradCr){
                //둘중에 뒷부분이 헌치인 경우
                let rSection = [ExtendPoint2D(lowerRebars[i][1], lowerRebars[i][0], overLapEndL), ... lowerRebars[i]]
                    rebarDict.push(new Rebar("상부배력철근", "7", ri["7"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100}))                    
            } else { //양측 직선인 경우
                straightRebars.push(lowerRebars[i])
                // let rSection = lowerRebars[i]
                // rebarDict.push(new Rebar("6", "test1", ri["6"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100}))
            }
        } else {
            console.log("lowerRebarErr", lowerRebars[i])
        }
    }
    for (let i = straightRebars.length-1;  i > 0 ; i--){ //가로보 헌치로 인하여 절단된 종방향 하부철근을 연결
        if (Math.abs(straightRebars[i][0].x - straightRebars[i-1][straightRebars[i-1].length-1].x)< 1200){
            straightRebars[i-1].push(...straightRebars[i])
            straightRebars.splice(i,1)
        }
    }
    for (let i = 0; i<straightRebars.length;i++) {
        for (let s in supportStation){ //연속지점부 하부철근
            if (straightRebars[i][0].x < supportStation[s] - inputT.supportRebarLength/2 && straightRebars[i][straightRebars[i].length-1].x > supportStation[s] + inputT.supportRebarLength/2){
                let l1 = [{x : supportStation[s] - inputT.supportRebarLength/2, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2, y : 1}]
                let l2 = [{x : supportStation[s] + inputT.supportRebarLength/2, y : 0}, {x : supportStation[s] + inputT.supportRebarLength/2, y : 1}]
                let centerRebar = TrimPolyLine(TrimPolyLine(straightRebars[i], l1, true), l2, false);
                rebarDict.push(new Rebar("하부배력철근", "6", ri["6"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
            }
        }
        for (let s = 0; s<supportNum-1; s++){
            if (s===0){ //시점경간 하부철근
                if (straightRebars[i][0].x < supportStation[s] - inputT.supportRebarLength/2 + overLapSupportL && 
                straightRebars[i][straightRebars[i].length-1].x > supportStation[s] - inputT.supportRebarLength/2  + overLapSupportL){
                    let l2 = [{x : supportStation[s] - inputT.supportRebarLength/2  + overLapSupportL, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2 + overLapSupportL, y : 1}]
                    let centerRebar = [ExtendPoint2D(straightRebars[i][1], straightRebars[i][0], overLapEndL), ...TrimPolyLine(straightRebars[i], l2, false)]
                    rebarDict.push(new Rebar("하부배력철근","6", ri["6"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
                }
            } 
            else if ( s=== supportNum-2){ //종점경간 하부철근
                if (straightRebars[i][0].x < supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL && 
                straightRebars[i][straightRebars[i].length-1].x > supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL){
                    let l1 = [{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL, y : 0},{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL, y : 1}]
                    // console.log(straightRebars[i], supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL)
                    let centerRebar = [...TrimPolyLine(straightRebars[i], l1, true), ExtendPoint2D(straightRebars[i][straightRebars[i].length-2], straightRebars[i][straightRebars[i].length-1], overLapEndL)]
                    rebarDict.push(new Rebar("하부배력철근","6", ri["6"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
                }
            } 
            else if (straightRebars[i][0].x < supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL && 
            straightRebars[i][straightRebars[i].length-1].x > supportStation[s] - inputT.supportRebarLength/2  + overLapSupportL
            ){ //중간경간 상부철근
                let l1 = [{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL, y : 0},{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL, y : 1}]
                let l2 = [{x : supportStation[s] - inputT.supportRebarLength/2  + overLapSupportL, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2 + overLapSupportL, y : 1}]
                let centerRebar = TrimPolyLine(TrimPolyLine(straightRebars[i], l1, true), l2, false)
                rebarDict.push(new Rebar("하부배력철근","6", ri["6"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
            } else {
                let centerRebar = [ExtendPoint2D(straightRebars[i][1], straightRebars[i][0], overLapEndL), ...straightRebars[i], ExtendPoint2D(straightRebars[i][straightRebars[i].length-2], straightRebars[i][straightRebars[i].length-1], overLapEndL)]
                rebarDict.push(new Rebar("하부배력철근","6", ri["6"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
            }
        }
    }

    //상부 종철근
    let upperRebars = [[top[0]]];
    let urIndex = 0
    for (let i = 0; i < top.length - 1; i++) {
        let p1 = top[i];
        let p2 = top[i+1];
        let dx = p2.x - p1.x
        let dy = p2.y - p1.y
        if (dx < err && dy > 100){
            let p3 = multiLineIntersect(bottom, [p1,p2], true, true);
            upperRebars.push([])
            urIndex++
            upperRebars[urIndex].push(p3)
            upperRebars[urIndex].push(p2)
        } else if (dx < err && dy < -100){
            let p4 = multiLineIntersect(bottom, [p1,p2], true, true);
            upperRebars[urIndex].push(p4)
            upperRebars.push([])
            urIndex++
            upperRebars[urIndex].push(p2)
        } else {
            upperRebars[urIndex].push(p2)
        }

    }
    for (let s in supportStation){ //지점부 상부철근
        let l1 = [{x : supportStation[s] - inputT.supportRebarLength/2, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2, y : 1}]
        let l2 = [{x : supportStation[s] + inputT.supportRebarLength/2, y : 0}, {x : supportStation[s] + inputT.supportRebarLength/2, y : 1}]
        //단부절취후 upperRebars Index : 1
        let centerRebar = TrimPolyLine(TrimPolyLine(upperRebars[1], l1, true), l2, false);
        rebarDict.push(new Rebar("상부배력철근","5", ri["5"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
    }
    //endRebar, 시종점부 상부철근
    let l1 = [{x : upperRebars[1][0].x + inputT.endRebarLength, y : 0},{x : upperRebars[1][0].x + inputT.endRebarLength, y : 1}]
    let l2 = [{x : upperRebars[1][upperRebars[1].length-1].x - inputT.endRebarLength, y : 0}, {x : upperRebars[1][upperRebars[1].length-1].x - inputT.endRebarLength, y : 1}]
    let endRebar1 = TrimPolyLine(upperRebars[1], l1, false);
    let endRebar2 = TrimPolyLine(upperRebars[1], l2, true);
    rebarDict.push(new Rebar("상부배력철근","5", ri["5"].dia, SplineToGlobal(endRebar1, sliceLinePoints), ri, {a:100}))
    rebarDict.push(new Rebar("상부배력철근","5", ri["5"].dia, SplineToGlobal(endRebar2, sliceLinePoints), ri, {a:100}))
    //centerRebar
    let overLapEnd = Math.max(overLap[inputT.endUpperRebarDia],overLap[inputT.centerUpperRebarDia])
    let overLapSupport = Math.max(overLap[inputT.supportUpperRebarDia],overLap[inputT.centerUpperRebarDia])
    for (let s = 0; s<supportNum-1; s++){
        if (s===0){ //시점경간 상부철근
            let l1 = [{x : upperRebars[1][0].x + inputT.endRebarLength - overLapEnd, y : 0},{x : upperRebars[1][0].x + inputT.endRebarLength  - overLapEnd, y : 1}]
            let l2 = [{x : supportStation[s] - inputT.supportRebarLength/2  + overLapSupport, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2 + overLapSupport, y : 1}]
            let centerRebar = TrimPolyLine(TrimPolyLine(upperRebars[1], l1, true), l2, false)
            rebarDict.push(new Rebar("상부배력철근", "5", ri["5"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
        } else if ( s=== supportNum-2){ //종점경간 상부철근
            let l1 = [{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupport, y : 0},{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupport, y : 1}]
            let l2 = [{x : upperRebars[1][upperRebars[1].length-1].x - inputT.endRebarLength + overLapEnd, y : 0}, {x : upperRebars[1][upperRebars[1].length-1].x - inputT.endRebarLength  + overLapEnd, y : 1}]
            let centerRebar = TrimPolyLine(TrimPolyLine(upperRebars[1], l1, true), l2, false)
            rebarDict.push(new Rebar("상부배력철근","5", ri["5"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
        } else { //중간경간 상부철근
            let l1 = [{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupport, y : 0},{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupport, y : 1}]
            let l2 = [{x : supportStation[s] - inputT.supportRebarLength/2  + overLapSupport, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2 + overLapSupport, y : 1}]
            let centerRebar = TrimPolyLine(TrimPolyLine(upperRebars[1], l1, true), l2, false)
            rebarDict.push(new Rebar("상부배력철근", "5", ri["5"].dia, SplineToGlobal(centerRebar, sliceLinePoints), ri, {a:100}))
        }
    }
    // upperRebars.slice(1,-1).forEach(rSection=>rebarDict.push(new Rebar("5", "test1", ri["5"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100})))
    // lowerRebars.forEach(rSection=>rebarDict.push(new Rebar("5", "test1", ri["5"].dia, SplineToGlobal(rSection, sliceLinePoints), ri, {a:100})))
    return rebarDict;
}