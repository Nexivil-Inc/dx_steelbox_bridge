import { LineToOffsetSpline, MainPointGenerator, multiLineIntersect, Point, PointToGlobal, Rebar, RefPoint, StPointToParallel, TwoPointsLength } from "@nexivil/package-modules";
import { DivideRebarSpacing, InterSectByRefPoint, LineSegmentsToPolyline, LoftCutBySpline, toRefPoint } from "@nexivil/package-modules/src/temp";
import { InterSectBySpline, Polygon2DOffset, SewPolyline } from "./module";

export function SlabRebarFn(deckModel, girderLayout, gridPointDict, deckPartInput){
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
        "1" : { dia : input.centerUpperRebarDia??"H25", id : "rType7", name : "endUpper"},
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

    // let deckModel = new Loft("concrete", "slabUpper", "concrete",deckPointDict["children"][0].points, false, )
    // let girderDeckList = [];
    // let crossDeckList = [];
    // for (let i = 0; i<girderNum;i++){
    //     let key = "slab" + String(i+1)
    //     let bottomDeck = deckPointDict["children"].find( function(arr){ return arr.meta.key === key} )
    //     girderDeckList.push(new Loft("concrete", key, "concrete", bottomDeck.points,  false))
    // }
    // for (let i = 0; i<girderNum+1;i++){
    //     let key = "slab" + String(i) + "-" +String(i+1)
    //     let bottomDeck = deckPointDict["children"].find( function(arr){ return arr.meta.key === key} )
    //     crossDeckList.push(new Loft("concrete", key, "concrete", bottomDeck.points,  false))
    // }
    let slabGeos = deckModel['children'].filter(obj=>obj.meta.key ==="slab").map(obj=>obj.threeFunc(new Point(0,0,0)))
    
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
    let leftK1 = deckModel.upperDict["CRK1"].leftPoint;
    let rightK1 = deckModel.upperDict["CRK1"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k1r))
    let leftK6 = deckModel.upperDict["CRK6"].leftPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6l))
    let rightK6 = deckModel.upperDict["CRK6"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6r))
    let leftK3 = deckModel.upperDict["CRK3"].leftPoint;
    let rightK3 = deckModel.upperDict["CRK3"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k1r))
    let leftK4 = deckModel.upperDict["CRK4"].leftPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6l))
    let rightK4 = deckModel.upperDict["CRK4"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6r))

    
    
    // 기존코드 컨버팅용 끝


    let start = Math.max(leftK3.mainStation, rightK3.mainStation);
    let end = Math.min(leftK4.mainStation, rightK4.mainStation);
    let stList = DivideRebarSpacing(start+100, end-100, input.centerctc, 0);
    for (let st of stList){
        let stPoint = MainPointGenerator(st, alignment,0);
        let ref = stPoint;
        let segs = slabGeos.map(obj => InterSectByRefPoint(obj, ref))
        let pLines = segs.map(seg=> LineSegmentsToPolyline(seg)[0])
        let rSection = Polygon2DOffset(SewPolyline(pLines, 50), input.cover.top??50, input.cover.bottom??55, input.cover.side??50, input.cover.side??50)[0]
        let upperRebar = [ rSection.bottom[0], ...rSection.top, rSection.bottom[rSection.bottom.length-1]]
        rebarDict.push(new Rebar(PointToGlobal(upperRebar, ref), ri, {a:100}, ri["1"].dia, {part : "상부주철근", key : "1"}))
        let lowerRebar = [ rSection.top[0], ...rSection.bottom, rSection.top[rSection.top.length-1]]
        rebarDict.push(new Rebar(PointToGlobal(lowerRebar, ref), ri, {a:100}, ri["5"].dia, {part : "하부주철근", key : "5"}))
        // rebarDict.push(...MainBottomRebarGenV2(rSection, ri, stPoint))
    }
    let SkewNum1 =  Math.floor(Math.abs( start -  Math.min(leftK1.mainStation, rightK1.mainStation))/input.endctc)
    if (SkewNum1>0){ //시점부 사각철근
        let sec1 = 1/Math.cos(skewk0);
        let k0 = MainPointGenerator(stk0, alignment, skewk0);
        for (let n = 0; n<SkewNum1 + 2;n++){
            let dst = sec1*input.cover.side + n*input.endctc;
            let stPoint = StPointToParallel(k0, dst, alignment);
            let ref = toRefPoint(stPoint,true);

            let segs = slabGeos.map(obj => InterSectByRefPoint(obj, ref))
            let pLines = segs.map(seg=> LineSegmentsToPolyline(seg)[0])
            let rSection = Polygon2DOffset(SewPolyline(pLines, 50), input.cover.top??50, input.cover.bottom??55, input.cover.side??50, input.cover.side??50)[0]
            let upperRebar = [ rSection.bottom[0], ...rSection.top, rSection.bottom[rSection.bottom.length-1]]

            rebarDict.push(new Rebar(PointToGlobal(upperRebar, ref), ri, {a:100}, ri["1-1"].dia, {part : "상부주철근", key : "1-1"}))
            // rebarDict.push(...MainBottomRebarGenV2(rSection, ri, refP))
            let lowerRebar = [ rSection.top[0], ...rSection.bottom, rSection.top[rSection.top.length-1]]
            rebarDict.push(new Rebar(PointToGlobal(lowerRebar, ref), ri, {a:100}, ri["5"].dia, {part : "하부주철근", key : "5"}))
        }
    }
    let SkewNum2 =  Math.floor(Math.abs( Math.max(leftK6.mainStation,rightK6.mainStation) - end)/input.endctc)
    if (SkewNum2>0){ //종점부 사각철근
        let sec2 = 1/Math.cos(skewk7);
        let k7 = MainPointGenerator(stk7, alignment, skewk7);
        for (let n = 0; n<SkewNum2 + 2;n++){
            let dst = -sec2*input.cover.side - n*input.endctc;
            let stPoint = StPointToParallel(k7, dst, alignment);
            let ref = toRefPoint(stPoint,true);
            
            let segs = slabGeos.map(obj => InterSectByRefPoint(obj, ref))
            let pLines = segs.map(seg=> LineSegmentsToPolyline(seg)[0])
            let rSection = Polygon2DOffset(SewPolyline(pLines, 50), input.cover.top??50, input.cover.bottom??55, input.cover.side??50, input.cover.side??50)[0]
            let upperRebar = [ rSection.bottom[0], ...rSection.top, rSection.bottom[rSection.bottom.length-1]]
            rebarDict.push(new Rebar(PointToGlobal(upperRebar, ref), ri, {a:100}, ri["1-1"].dia, {part : "상부주철근", key : "1-1"}))
            // rebarDict.push(...MainBottomRebarGenV2(rSection, ri, ref))
            let lowerRebar = [ rSection.top[0], ...rSection.bottom, rSection.top[rSection.top.length-1]]
            rebarDict.push(new Rebar(PointToGlobal(lowerRebar, ref), ri, {a:100}, ri["5"].dia, {part : "하부주철근", key : "5"}))
        }
    }
    let leftOffset = deckModel.upperDict["CRK1"].leftPoint.offset + input.cover.side
    let rightOffset = deckModel.upperDict["CRK1"].rightPoint.offset - input.cover.side
    let offsetList = DivideRebarSpacing(leftOffset, rightOffset, inputT.ctc)
    for (let off of offsetList.slice(0,10)){
        //곡교일 경우 station이 교차할 수 있음
        let sliceLine = LineToOffsetSpline(alignment, off, gridPointDict["CRS0"], gridPointDict["CRS"+String(supportNum+1)])
        let segs = slabGeos.map(obj => InterSectBySpline(obj, sliceLine)) //segments의 개수가 2개가 아니라 3개도 나옴, 연산시간 과다소요!!!!! sliceLine 개수 최적화해야함
        let pLines = [];
        segs.forEach(seg=> pLines.push(...SewPolyline(seg, 0.1)))
        let sewPline = SewPolyline(pLines, 10)
        let sideSection = sewPline[0].map(pt=> new Point(pt.station, pt.z, 0))
        let rSection = Polygon2DOffset([sideSection], input.cover.top??50, input.cover.bottom??55, input.cover.side??50, input.cover.side??50)[0]
        console.log(sideSection, rSection)
        
        // rebarDict.push(new Rebar(sewPline[0], ri, {a:100}, ri["5"].dia, {part : "상부배력철근", key : "5"}))

        // new Spline (OffsetLine(off, alignment.points)) //, gridPointDict["CRK1"], gridPointDict["CRK6"]
        // let Section = LoftCutBySpline(deckModel.points, sliceLine.points, false, false);
        // let topCount = Section.length;
        // let bottomCount = 0;
        // Section.sort(function(a,b){return a.station<b.station?-1:1}) //단면이 교차하여 역전되는 현상이 있음
        // for (let bottomDeck of [...crossDeckList,...girderDeckList]){
        //     let bSection = LoftCutBySpline(bottomDeck.points, sliceLine.points, false, false);
        //     if(bSection.length>0){
        //         bSection.sort(function(a,b){return a.station<b.station?-1:1}) //단면이 교차하여 역전되는 현상이 있음
        //         bottomCount = bSection.length;
        //         Section.push(...bSection.reverse())
        //         break;
        //     }
        // }
        // let cover = [];
        // let ptCount = topCount+bottomCount;
        // for (let c = 0; c < ptCount; c++) {
        //     if (c === ptCount - 1 || c === topCount-1) {
        //         cover.push(input.cover.side);
        //     } else if (c < topCount-1) {
        //         cover.push(input.cover.top);
        //     } else {
        //         cover.push(input.cover.bottom);
        //     }
        // }
        // let sideSection = [];
        // Section.forEach(pt=> sideSection.push(new Point(pt.station, pt.z, 0)))
        // let rSection = concToRebarOffset(sideSection, cover, true, true)//사각을 고려하여 측면의 피복을 변화시켜야함
        // rebarDict.push(...transRebarGen(rSection, topCount, ri, sliceLine.points, gridPointDict, inputT, supportNum))
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