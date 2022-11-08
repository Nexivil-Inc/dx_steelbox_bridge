import { IntersectionPointOnSpline, LineLength, LineToOffsetSpline, MainPointGenerator, multiLineIntersect, overLap, Point, PointToGlobal, Rebar, RefPoint, StPointToParallel, TrimPolyLine, TwoLineIntersect, TwoPointsLength } from "@nexivil/package-modules";
import { DivideRebarSpacing, ExtendPoint2D, InterSectByRefPoint, LineSegmentsToPolyline, LoftCutBySpline, SplineToGlobal, toRefPoint } from "@nexivil/package-modules/src/temp";
import { ToGlobalPoint2 } from "../model/utils";
import { InterSectBySpline, Polygon2DOffset, SewPolyline } from "./module";

export function SlabRebarFn(deckModel, girderLayout, gridPointDict, deckPartInput, girderBaseInfo){
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
    let inputT =  deckPartInput.longiRebar //종철근
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
    const supportNum = girderLayout.supportCount - 2;
    const blockOutL = girderBaseInfo.common.blockOutL
    let alignment = girderLayout.alignment;
    let slabGeos = deckModel['children'].filter(obj=>obj.meta.key ==="slab").map(obj=>obj.threeFunc(new Point(0,0,0)))

    let leftK0 = deckModel.upperDict["CRK0"].leftPoint;
    let rightK0 = deckModel.upperDict["CRK0"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k1r))
    let leftK7 = deckModel.upperDict["CRK7"].leftPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6l))
    let rightK7 = deckModel.upperDict["CRK7"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6r))
    let leftK3 = deckModel.upperDict["CRK3"].leftPoint;
    let rightK3 = deckModel.upperDict["CRK3"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k1r))
    let leftK4 = deckModel.upperDict["CRK4"].leftPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6l))
    let rightK4 = deckModel.upperDict["CRK4"].rightPoint;//AlignmentToMatchedPoint(alignment, toRefPoint(k6r))
    
    //중앙부 횡방향 
    let start = Math.max(leftK3.mainStation, rightK3.mainStation);
    let end = Math.min(leftK4.mainStation, rightK4.mainStation);
    let stList = DivideRebarSpacing(start+50, end-50, input.centerctc, 1);
    
    for (let st of stList){
        let stPoint = MainPointGenerator(st, alignment,0);
        let ref = stPoint;
        let segs = slabGeos.map(obj => InterSectByRefPoint(obj, ref))
        let pLines = segs.map(seg=> LineSegmentsToPolyline(seg)[0])
        let rSection = Polygon2DOffset(SewPolyline(pLines, 50), input.cover.top??50, input.cover.bottom??55, input.cover.side??50, input.cover.side??50, true)[0]
        rebarDict.push(... transRebarGen(rSection, ri, ref, input))
    }
    //시점단부 횡방향
    let startCover = 1/Math.cos(gridPointDict["CRK0"].skew)*input.cover.side;
    let startAdd = gridPointDict["CRK0"].skew !== 0? input.endctc : 0
    let startStList = [ startCover, startCover + blockOutL/2,
        ...DivideRebarSpacing(startCover + blockOutL,  startAdd + Math.abs(start -  Math.min(leftK0.mainStation, rightK0.mainStation)), input.endctc, 0)];
    for (let dst of startStList){
        let stPoint = StPointToParallel(gridPointDict["CRK0"], dst, alignment);
        let ref = toRefPoint(stPoint,true);
        let segs = slabGeos.map(obj => InterSectByRefPoint(obj, ref))
        let pLines = segs.map(seg=> LineSegmentsToPolyline(seg)[0])
        let rSection = Polygon2DOffset(SewPolyline(pLines, 50), input.cover.top??50, input.cover.bottom??55, input.cover.side??50, input.cover.side??50, true)[0]
        rebarDict.push(... transRebarGen(rSection, ri, ref, input))
    }
    //종점단부 횡방향
    let endCover = 1/Math.cos(gridPointDict["CRK7"].skew)*input.cover.side;
    let endAdd = gridPointDict["CRK7"].skew !== 0? input.endctc : 0
    let endStList = [ endCover, endCover + blockOutL/2,
        ...DivideRebarSpacing(endCover + blockOutL, endAdd + Math.abs(Math.max(leftK7.mainStation, rightK7.mainStation)- end), input.endctc, 0)];
    for (let dst of endStList){
        let stPoint = StPointToParallel(gridPointDict["CRK7"], -1*dst, alignment);
        let ref = toRefPoint(stPoint,true);
        let segs = slabGeos.map(obj => InterSectByRefPoint(obj, ref))
        let pLines = segs.map(seg=> LineSegmentsToPolyline(seg)[0])
        let rSection = Polygon2DOffset(SewPolyline(pLines, 50), input.cover.top??50, input.cover.bottom??55, input.cover.side??50, input.cover.side??50, true)[0]
        rebarDict.push(... transRebarGen(rSection, ri, ref, input))
    }
    //종방향철근 생성
    let dSide = Math.max(input.centerUpperRebarDia.slice(1)*1 + inputT.centerUpperRebarDia.slice(1)*1, input.centerLowerRebarDia.slice(1)*1 + inputT.centerLowerRebarDia.slice(1)*1)/2 + input.cover.side
    let dTop = (input.centerUpperRebarDia.slice(1)*1 + inputT.centerUpperRebarDia.slice(1)*1)/2 + input.cover.top
    let dBottom = (input.centerLowerRebarDia.slice(1)*1 + inputT.centerLowerRebarDia.slice(1)*1)/2 + input.cover.bottom
    let leftOffset = deckModel.upperDict["CRK1"].leftPoint.offset + dSide
    let rightOffset = deckModel.upperDict["CRK1"].rightPoint.offset - dSide
    let offsetList = DivideRebarSpacing(leftOffset, rightOffset, inputT.ctc, 1)
   
    for (let off of offsetList){
        //곡교일 경우 station이 교차할 수 있음
        let sliceLine = LineToOffsetSpline(alignment, off, gridPointDict["CRS0"], gridPointDict["CRS"+String(supportNum+1)])
        let segs = slabGeos.map(obj => InterSectBySpline(obj, sliceLine)) //segments의 개수가 2개가 아니라 3개도 나옴, 연산시간 과다소요!!!!! sliceLine 개수 최적화해야함
        let pLines = [];
        segs.forEach(seg=> pLines.push(...SewPolyline(seg, 0.1)))
        let sewPline = SewPolyline(pLines, 10)
        let sideSection = sewPline[0].map(pt=> new Point(pt.station, pt.z, 0))
        let rSection = Polygon2DOffset([sideSection], (dTop)??50, (dBottom)??55, startCover??50, endCover??50)[0]
        rebarDict.push(...longiRebarGen(rSection, ri, sliceLine, gridPointDict, inputT, supportNum))
    }
    return { "children" : rebarDict, "rebarInfo" : ri, input, inputT }
}
function longiRebarGen(rebarSection, ri, sliceLine, gridPointDict, inputT, supportNum) {
    let err = 0.1
    let gradCr = 0.15
    let top = rebarSection.top;
    if(top[0].x > top[top.length-1].x){
        top.reverse()
    }
    let bottom = rebarSection.bottom;
    if(bottom[0].x > bottom[bottom.length-1].x){
        bottom.reverse()
    }
    let rIndex = 0;
    let lowerRebars = [[bottom[0]]];
    let supportStation = [];
    for (let i = 2; i<supportNum;i++){
        let key = "CRS"+String(i)
        let newP = IntersectionPointOnSpline(sliceLine, gridPointDict[key])
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
            lowerRebars[i].unshift(ExtendPoint2D(top[1], top[0], -500))
            let rSection = lowerRebars[i]
            rebarDict.push(new Rebar(SplineToGlobal(rSection, sliceLine.points), ri, {a:100}, ri["10"].dia, {part : "하부배력철근", key : "10"}))
        } else if(i===lowerRebars.length-1){//종점 하부철근 굽힘
            lowerRebars[i].push(top[top.length-1])
            lowerRebars[i].push(ExtendPoint2D(top[top.length-2], top[top.length-1], -500))
            let rSection = lowerRebars[i]
            rebarDict.push(new Rebar(SplineToGlobal(rSection, sliceLine.points), ri, {a:100}, ri["10"].dia, {part : "하부배력철근", key : "10"}))
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
                        rebarDict.push(new Rebar(SplineToGlobal(rSection, sliceLine.points), ri, {a:100}, ri["C1"].dia, {part : "가로보철근", key : "C1"}))
                    }
                } else { //박스구간 하면 헌치 철근
                    let rSection = lowerRebars[i] 
                    if (rSection.length>3){//오류철근 포함방지용!!
                        rebarDict.push(new Rebar(SplineToGlobal(rSection, sliceLine.points), ri, {a:100}, ri["8"].dia, {part : "하부배력철근", key : "8"}))                    
                    }
                } 
            } else if(Math.abs(dy/dx)>gradCr){
                //둘중에 앞부분이 헌치인 경우
                let rSection = [... lowerRebars[i], ExtendPoint2D(lowerRebars[i][lowerRebars[i].length-2], lowerRebars[i][lowerRebars[i].length-1], overLapEndL)]
                    rebarDict.push(new Rebar(SplineToGlobal(rSection, sliceLine.points), ri, {a:100}, ri["7"].dia, {part : "하부배력철근", key : "7"}))                    
            } else if(Math.abs(dy2/dx2)>gradCr){
                //둘중에 뒷부분이 헌치인 경우
                let rSection = [ExtendPoint2D(lowerRebars[i][1], lowerRebars[i][0], overLapEndL), ... lowerRebars[i]]
                    rebarDict.push(new Rebar(SplineToGlobal(rSection, sliceLine.points), ri, {a:100}, ri["7"].dia, {part : "하부배력철근", key : "7"}))                    
            } else { //양측 직선인 경우
                straightRebars.push(lowerRebars[i])
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
                rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100}, ri["6"].dia, {part : "하부배력철근", key : "6"}, ))
            }
        }
        for (let s = 0; s<supportNum-1; s++){
            if (s===0){ //시점경간 하부철근
                if (straightRebars[i][0].x < supportStation[s] - inputT.supportRebarLength/2 + overLapSupportL && 
                straightRebars[i][straightRebars[i].length-1].x > supportStation[s] - inputT.supportRebarLength/2  + overLapSupportL){
                    let l2 = [{x : supportStation[s] - inputT.supportRebarLength/2  + overLapSupportL, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2 + overLapSupportL, y : 1}]
                    let centerRebar = [ExtendPoint2D(straightRebars[i][1], straightRebars[i][0], overLapEndL), ...TrimPolyLine(straightRebars[i], l2, false)]
                    rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100}, ri["6"].dia, {part : "하부배력철근",key : "6"}))
                }
            } 
            else if ( s=== supportNum-2){ //종점경간 하부철근
                if (straightRebars[i][0].x < supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL && 
                straightRebars[i][straightRebars[i].length-1].x > supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL){
                    let l1 = [{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL, y : 0},{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL, y : 1}]
                    // console.log(straightRebars[i], supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL)
                    let centerRebar = [...TrimPolyLine(straightRebars[i], l1, true), ExtendPoint2D(straightRebars[i][straightRebars[i].length-2], straightRebars[i][straightRebars[i].length-1], overLapEndL)]
                    rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100}, ri["6"].dia, {part : "하부배력철근",key : "6"} ))
                }
            } 
            else if (straightRebars[i][0].x < supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL && 
            straightRebars[i][straightRebars[i].length-1].x > supportStation[s] - inputT.supportRebarLength/2  + overLapSupportL
            ){ //중간경간 상부철근
                let l1 = [{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL, y : 0},{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupportL, y : 1}]
                let l2 = [{x : supportStation[s] - inputT.supportRebarLength/2  + overLapSupportL, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2 + overLapSupportL, y : 1}]
                let centerRebar = TrimPolyLine(TrimPolyLine(straightRebars[i], l1, true), l2, false)
                rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100},ri["6"].dia, {part : "하부배력철근", key : "6"}))
            } else {
                let centerRebar = [ExtendPoint2D(straightRebars[i][1], straightRebars[i][0], overLapEndL), ...straightRebars[i], ExtendPoint2D(straightRebars[i][straightRebars[i].length-2], straightRebars[i][straightRebars[i].length-1], overLapEndL)]
                rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100}, ri["6"].dia, {part : "하부배력철근",key : "6"}))
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
        rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100}, ri["5"].dia, {part : "상부배력철근",key : "5"}))
    }
    //endRebar, 시종점부 상부철근
    let l1 = [{x : upperRebars[1][0].x + inputT.endRebarLength, y : 0},{x : upperRebars[1][0].x + inputT.endRebarLength, y : 1}]
    let l2 = [{x : upperRebars[1][upperRebars[1].length-1].x - inputT.endRebarLength, y : 0}, {x : upperRebars[1][upperRebars[1].length-1].x - inputT.endRebarLength, y : 1}]
    let endRebar1 = TrimPolyLine(upperRebars[1], l1, false);
    let endRebar2 = TrimPolyLine(upperRebars[1], l2, true);
    rebarDict.push(new Rebar(SplineToGlobal(endRebar1, sliceLine.points), ri, {a:100}, ri["5"].dia, {part : "상부배력철근",key : "5"}))
    rebarDict.push(new Rebar(SplineToGlobal(endRebar2, sliceLine.points), ri, {a:100}, ri["5"].dia, {part : "상부배력철근", key : "5"}))
    //centerRebar
    let overLapEnd = Math.max(overLap[inputT.endUpperRebarDia],overLap[inputT.centerUpperRebarDia])
    let overLapSupport = Math.max(overLap[inputT.supportUpperRebarDia],overLap[inputT.centerUpperRebarDia])
    for (let s = 0; s<supportNum-1; s++){
        if (s===0){ //시점경간 상부철근
            let l1 = [{x : upperRebars[1][0].x + inputT.endRebarLength - overLapEnd, y : 0},{x : upperRebars[1][0].x + inputT.endRebarLength  - overLapEnd, y : 1}]
            let l2 = [{x : supportStation[s] - inputT.supportRebarLength/2  + overLapSupport, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2 + overLapSupport, y : 1}]
            let centerRebar = TrimPolyLine(TrimPolyLine(upperRebars[1], l1, true), l2, false)
            rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100}, ri["5"].dia, {part : "상부배력철근", key : "5"}))
        } else if ( s=== supportNum-2){ //종점경간 상부철근
            let l1 = [{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupport, y : 0},{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupport, y : 1}]
            let l2 = [{x : upperRebars[1][upperRebars[1].length-1].x - inputT.endRebarLength + overLapEnd, y : 0}, {x : upperRebars[1][upperRebars[1].length-1].x - inputT.endRebarLength  + overLapEnd, y : 1}]
            let centerRebar = TrimPolyLine(TrimPolyLine(upperRebars[1], l1, true), l2, false)
            rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100}, ri["5"].dia, {part : "상부배력철근", key : "5"}))
        } else { //중간경간 상부철근
            let l1 = [{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupport, y : 0},{x : supportStation[s-1] + inputT.supportRebarLength/2 - overLapSupport, y : 1}]
            let l2 = [{x : supportStation[s] - inputT.supportRebarLength/2  + overLapSupport, y : 0},{x : supportStation[s] - inputT.supportRebarLength/2 + overLapSupport, y : 1}]
            let centerRebar = TrimPolyLine(TrimPolyLine(upperRebars[1], l1, true), l2, false)
            rebarDict.push(new Rebar(SplineToGlobal(centerRebar, sliceLine.points), ri, {a:100}, ri["5"].dia, {part : "상부배력철근", key : "5"}))
        }
    }
    return rebarDict;
}


function transRebarGen(rebarSection, ri, refPoint) {
    let err = 0.1
    let gradCr = 0.15
    let extending = 400

    let top = rebarSection.top;
    if(top[0].x > top[top.length-1].x){
        top.reverse()
    }
    let bottom = rebarSection.bottom;
    if(bottom[0].x > bottom[bottom.length-1].x){
        bottom.reverse()
    }
    let rIndex = 0;
    let lowerRebars = [[bottom[0]]];

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
    let upperRebar = [ bottom[0], ...top, bottom[bottom.length-1]]
    rebarDict.push(new Rebar(PointToGlobal(upperRebar, refPoint), ri, {a:100}, ri["1"].dia, {part : "상부주철근", key : "1"}))

    //lowerRebar개수에 따라 1개인 경우 예외처리가 필요함

    for (let i = 0; i<lowerRebars.length;i++){
        if(i===0){ //시점 하부철근 굽힘
            lowerRebars[i].unshift(top[0])
            let rSection = lowerRebars[i]
            rebarDict.push(new Rebar(PointToGlobal(rSection, refPoint), ri, {a:100}, ri["3"].dia, {part : "하부주철근", key : "3"}))
        } else if(i===lowerRebars.length-1){//종점 하부철근 굽힘
            lowerRebars[i].push(top[top.length-1])
            let rSection = lowerRebars[i]
            rebarDict.push(new Rebar(PointToGlobal(rSection, refPoint), ri, {a:100}, ri["3"].dia, {part : "하부주철근", key : "3"}))
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
                if (Math.abs(p3.x - p2.x) < 1000){ //헌치간격이 좁은 경우, 플레이트부라고 판단함, 
                    let rSection = lowerRebars[i]
                    if (rSection.length>3){//오류철근 포함방지용
                        rebarDict.push(new Rebar(PointToGlobal(rSection, refPoint), ri, {a:100}, ri["9"].dia, {part : "하부주철근", key : "9-1"}))
                    }
                } else { //박스구간 하면 헌치 철근
                    let rSection = lowerRebars[i] 
                    if (rSection.length>3){//오류철근 포함방지용!!
                        rebarDict.push(new Rebar(PointToGlobal(rSection, refPoint), ri, {a:100}, ri["9"].dia, {part : "하부주철근", key : "9"}))                    
                    }
                } 
            } else if(Math.abs(dy/dx)>gradCr){
                //둘중에 앞부분이 헌치인 경우
                let rSection = [... lowerRebars[i], ExtendPoint2D(lowerRebars[i][lowerRebars[i].length-2], lowerRebars[i][lowerRebars[i].length-1], extending)]
                    rebarDict.push(new Rebar(PointToGlobal(rSection, refPoint), ri, {a:100}, ri["7"].dia, {part : "하부주철근", key : "7"}))                    
            } else if(Math.abs(dy2/dx2)>gradCr){
                //둘중에 뒷부분이 헌치인 경우
                let rSection = [ExtendPoint2D(lowerRebars[i][1], lowerRebars[i][0], extending), ... lowerRebars[i]]
                    rebarDict.push(new Rebar(PointToGlobal(rSection, refPoint), ri, {a:100}, ri["7"].dia, {part : "하부주철근", key : "7"}))                    
            } else { //양측 직선인 경우
                straightRebars.push(lowerRebars[i])
            }
        } else {
            // console.log("transLowerRebarErr", lowerRebars[i])
        }
    }
    for (let i = straightRebars.length-1;  i > 0 ; i--){ //가로보 헌치로 인하여 절단된 종방향 하부철근을 연결
        if (Math.abs(straightRebars[i][0].x - straightRebars[i-1][straightRebars[i-1].length-1].x)< 1200){
            straightRebars[i-1].push(...straightRebars[i])
            straightRebars.splice(i,1)
        }
    }
    for (let i in straightRebars){
        let l = straightRebars[i].length
        let pts = [ExtendPoint2D(straightRebars[i][1], straightRebars[i][0], extending), ...straightRebars[i], ExtendPoint2D(straightRebars[i][l-2], straightRebars[i][l-1], extending)]
        rebarDict.push(new Rebar(PointToGlobal(pts, refPoint), ri, {a:100}, ri["4"].dia, {part : "하부주철근", key : "4"}))
    }

    return rebarDict;
}

export function BottomRebarModel(rebarInfo, mainPartModel, sectionPointDict, girderLayout) {
    let alignemnt = girderLayout.alignment
    let bottomRebarDict = { parent: [], children: [],};

    let startPoint = {};
    let endPoint = {};
    let topOff = rebarInfo.cover.top??50;
    let sideOff = rebarInfo.cover.side??50;
    let bottomOff = rebarInfo.cover.bottom??55;
    let endOff = rebarInfo.cover.side??50;
    let spacing = rebarInfo.spacing??125; 
    let loopRebarDia = rebarInfo.loopRebarDia??"H16"; 
    let longiRebarDia = rebarInfo.longiRebarDia??"H16"; 
    // let rebarDia = "";
    let ri = { //rebar info
        "B1" : { dia : loopRebarDia, id : "rType4", name : "상부스터럽"},
        "B2" : { dia : loopRebarDia, id : "rType5", name : "하부스터럽"},
        "C1" : { dia : longiRebarDia, id : "rType4", name : "상부종방향"},
        "C2" : { dia : longiRebarDia, id : "rType1", name : "하부종방향"},
    }
    // let transRebarList = [];
    let lConcModels = mainPartModel.filter(obj => obj.meta.key.includes("lConc"))
    for (let st in lConcModels) {
            // let transRebarSub = []
            let lConc = lConcModels[st]
            let geo = lConc.threeFunc(new Point(0,0,0))
            startPoint = lConc.meta.gridPoints[0].point
            endPoint = lConc.meta.gridPoints[lConc.meta.gridPoints.length - 1].point
            let section = sectionPointDict[lConc.meta.gridPoints[0].key].forward;
            let startSection = sectionPointDict[lConc.meta.gridPoints[0].key].forward.lConc
            let endSection = sectionPointDict[lConc.meta.gridPoints[lConc.meta.gridPoints.length - 1].key].backward.lConc
            let startTan = Math.tan(startPoint.skew)
            let endTan = Math.tan(endPoint.skew)
            let startAdd = Math.max(startTan*startSection[1].x, startTan*startSection[2].x)
            let endAdd = Math.min(endTan*endSection[1].x, endTan*endSection[2].x)

            let startStList =  DivideRebarSpacing(endOff, endOff + Math.abs(startTan*startSection[1].x - startTan*startSection[2].x), spacing, 0)
            let centerStList = DivideRebarSpacing(startAdd + endOff, endAdd + endPoint.mainStation - startPoint.mainStation - endOff, spacing)
            let endStList =  DivideRebarSpacing(- endOff, -endOff - Math.abs(endTan*endSection[1].x - endTan*endSection[2].x), spacing, 0)
            let allList = [
                {stList :startStList, skew : startPoint.skew, cp : startPoint}, 
                {stList : centerStList, skew : 0, cp : {...startPoint, skew : 0}}, 
                {stList : endStList, skew : endPoint.skew, cp : endPoint}
            ]
            let sec1 = 1/Math.cos(startPoint.skew)
            let sec2 = 1/Math.cos(endPoint.skew)
            for (let l of allList){
                let skew = l.skew
                let sec = 1/Math.cos(skew)
                if(l.stList.length>1){
                    for (let station of l.stList) {
                        let origin = PointToGlobal(new Point(0,0, -station), l.cp)
                        let cp = toRefPoint(origin, true);
                        let section2D = SewPolyline(InterSectByRefPoint(geo, cp), 0.01)
                        if(section2D.length>0){
                            let mainRebar = BottomMainRebarGen(section2D, topOff, sideOff*sec, bottomOff, section, sec)
                            if (mainRebar) {
                                for (let r in mainRebar.topRebar) {
                                    let gPts = PointToGlobal(mainRebar.topRebar[r], cp) 
                                    bottomRebarDict["children"].push(
                                    new Rebar(gPts, ri, {}, ri["B1"].dia, {part : "하부콘크리트철근", key:"B1"}))
                                }
                                for (let r in mainRebar.bottomRebar) {
                                    let gPts = PointToGlobal(mainRebar.bottomRebar[r], cp) ;
                                    bottomRebarDict["children"].push(
                                    new Rebar(gPts, ri, {}, ri["B1"].dia, {part : "하부콘크리트철근", key:"B2"}))
                                }
                            }
                        }
                    }
                    // transRebarList.push(transRebarSub)
                }
            }
            let dia = (loopRebarDia.slice(1)*1 + longiRebarDia.slice(1)*1)/2
            let transRebarOffset = [startSection[1].x + sideOff + dia, -660, -510, -360, -210, -75, 75, 210, 360, 510, 660, startSection[2].x - sideOff -dia]; //상세값을 전달받아서 수정해야함
            let gLine = girderLayout.girderSplines[lConc.meta.girder-1]
            let part = "하부콘크리트철근"
            for (let offset of transRebarOffset){
                let sliceLine = LineToOffsetSpline(gLine, offset)
                let section = SewPolyline(InterSectBySpline(geo, sliceLine), 0.01)[0]
                if (section.length>3){
                    let section2D = section.map(pt=> new Point(pt.station, pt.z))
                    let rebar = Polygon2DOffset([section2D], topOff+dia, bottomOff+dia, sideOff*sec1, sideOff*sec2, true)[0]
                    let upperRebar = [rebar.bottom[0], ...rebar.top, rebar.bottom[rebar.bottom.length-1]]
                    bottomRebarDict["children"].push(new Rebar( SplineToGlobal(upperRebar, sliceLine.points), ri, {}, ri["C1"].dia, {part, key : "C1"}))
                    bottomRebarDict["children"].push(new Rebar( SplineToGlobal(rebar.bottom, sliceLine.points), ri, {}, ri["C2"].dia, {part, key : "C2"}))
                }
            }
    
        }
    return bottomRebarDict
}

export function BottomMainRebarGen(section2D, topOff, sideOff, bottomOff, sectionPoint, sec) {
    let ribLayout = sectionPoint?.input.Lrib.layout??[-400, 400] //향후 단면에서 받아올 수 있도록
    let rebar = Polygon2DOffset(section2D, topOff, bottomOff, sideOff, sideOff, true)[0];  //concToRebarOffset(section2D, offsets)
    let top1 = rebar.top[0];
    let top2 = rebar.top[rebar.top.length-1];
    let bottom1 = rebar.bottom[0];
    let bottom2 = rebar.bottom[rebar.bottom.length-1];
    if (top1 && top2 && bottom1 && bottom2) {
        let topRebar = [[ExtendPoint2D(bottom1, top1, -100), top1, top2, ExtendPoint2D(bottom2, top2, -100)]];
        let bottomRebarList = []; //하부철근
        let uCp = [];
        let lCp = [];
        for (let i in ribLayout) {
            uCp.push({ x: (top1.x + top2.x) / 2 + ribLayout[i]*sec, y: (top1.y + top2.y) / 2 });
            lCp.push({ x: (bottom1.x + bottom2.x) / 2 + ribLayout[i]*sec, y: (bottom1.y + bottom2.y) / 2 })
        }
        for (let i = 0; i < ribLayout.length + 1; i++) {
            if (i === 0) {
                bottomRebarList.push(
                    [
                        ExtendPoint2D(top2, top1, -100),
                        top1,
                        bottom1,
                        ExtendPoint2D(bottom1, lCp[i], -75*sec),
                        ExtendPoint2D(top1, uCp[i], -75*sec),
                        ExtendPoint2D(top1, uCp[i], -75*sec-100)
                    ]
                )
            } else if (i === ribLayout.length) {
                bottomRebarList.push(
                    [
                        ExtendPoint2D(top1, top2, -100),
                        top2,
                        bottom2,
                        ExtendPoint2D(bottom2, lCp[i - 1], -75*sec),
                        ExtendPoint2D(top2, uCp[i - 1], -75*sec),
                        ExtendPoint2D(top2, uCp[i - 1], -75*sec-100)
                    ]
                )
            } else {
                bottomRebarList.push(
                    [
                        ExtendPoint2D(uCp[i - 1], uCp[i], -75*sec-100),
                        ExtendPoint2D(uCp[i - 1], uCp[i], -75*sec),
                        ExtendPoint2D(lCp[i - 1], lCp[i], -75*sec),
                        ExtendPoint2D(lCp[i], lCp[i - 1], -75*sec),
                        ExtendPoint2D(uCp[i], uCp[i - 1], -75*sec),
                        ExtendPoint2D(uCp[i], uCp[i - 1], -75*sec-100)
                    ]
                )
            }
        }
        return { bottomRebar: bottomRebarList, topRebar, rebar }
    } else {
        console.log("bottomConcMainRebar is blank", section2D)
    }
}

//////////////////


export function BarrierRebarModel(rebarInfo, barrierModel, alignment, deckModel) {
    // let overLap = { "H13": 460, "H16": 570, "H19": 690, "H22": 790 } //철근 겹침길이
    let topOff = rebarInfo.cover.top??50;
    let sideOff = rebarInfo.cover.side??50;
    let bottomOff = rebarInfo.cover.bottom??55;
    let endOff = 50;
    let barrierRebarDict = { parent: [], children: [], section: [] };
    let slabGeos = deckModel['children'].filter(obj=>obj.meta.key ==="slab").map(obj=>obj.threeFunc(new Point(0,0,0)))
    let spacing = rebarInfo.spacing //125; //단부 철근 간격
    let loopRebarDia = rebarInfo.loopRebarDia//16; 
    let longiRebarDia = rebarInfo.longiRebarDia //16; 
    let shearRebarDia = rebarInfo.shearRebarDia //16; 
    let transRebarList = [];
    let rebarDia = ""
    let ri = { //rebar info
        "N1" : { dia : loopRebarDia, id : "rType", name : "스터럽"},
        "N2" : { dia : shearRebarDia, id : "rType", name : "전단철근"},
        "N3" : { dia : longiRebarDia, id : "rType", name : "종방향철근"},
    }
    for (let st in barrierModel) {
        let transRebarSub = []
        let Barrier = barrierModel[st]
        let geo = Barrier.threeFunc(new Point(0,0,0))

        let startStation = Math.max(Barrier.points[0][0].mainStation, Barrier.points[0][Barrier.points[0].length-1].mainStation)
        let endStation = Math.min(Barrier.points[Barrier.points.length - 1][0].mainStation, Barrier.points[Barrier.points.length - 1][Barrier.points[Barrier.points.length - 1].length-1].mainStation)
        let stList = DivideRebarSpacing(startStation + endOff, endStation - endOff, spacing, 1)
        for (let station of stList){
            let skew = 0
            let cp = toRefPoint(MainPointGenerator(station, alignment, skew), true)
            let section2D = SewPolyline(InterSectByRefPoint(geo, cp), 0.1)
            
            let segs = slabGeos.map(obj => InterSectByRefPoint(obj, cp))
            let pLines = segs.map(seg=> LineSegmentsToPolyline(seg)[0])
            let rSection = Polygon2DOffset(SewPolyline(pLines, 50), topOff, bottomOff, 0, 0, true)[0]
            if(section2D.length>0){
                let mainRebar = BarrierMainRebarGen(section2D, sideOff, Barrier["meta"]["part"], rSection.bottom)
                let transRebarPoints = BarrierTransRebarGen(section2D, sideOff, Barrier["meta"]["part"])
                rebarDia = loopRebarDia;
                for (let r in mainRebar.topRebar) {
                    let gPts = PointToGlobal(mainRebar.topRebar[r], cp);
                    barrierRebarDict["children"].push(new Rebar(gPts, ri, {}, ri["N1"].dia, {part : "방호벽철근", key:"N1"}))
                }
                rebarDia = shearRebarDia;
                for (let r in mainRebar.shearRebar) {
                    let gPts = PointToGlobal(mainRebar.shearRebar[r], cp);
                    barrierRebarDict["children"].push(new Rebar(gPts, ri, {}, ri["N2"].dia, {part : "방호벽철근", key:"N2"}))
                }
                transRebarSub.push(PointToGlobal(transRebarPoints, cp))
            }
        }
        transRebarList.push(transRebarSub)
    }
    rebarDia = longiRebarDia;
    for (let t in transRebarList) {
        for (let j = 0; j < transRebarList[t][0].length; j++) {
            let gPts = [];
            for (let i = 0; i < transRebarList[t].length; i++) {
                gPts.push(transRebarList[t][i][j])
            }
            barrierRebarDict["children"].push(new Rebar(gPts, ri, {}, ri["N3"].dia, {part : "방호벽철근", key:"N3"}))
        }
    }
    return barrierRebarDict
}

export function BarrierMainRebarGen(section2D, cover, sectionName, lowerSlabRebarPoints=undefined) {
    let isClockWise = true;
    if (sectionName.includes("우")) {
        isClockWise = false;
    }
    let rebar = Polygon2DOffset(section2D, cover, 0, cover, cover, true)[0];
    // console.log(section2D, rebar)
    let topRebar = []
    let pt1 = ExtendPoint2D(rebar.left[1], rebar.left[0], 200)
    let pt2 = ExtendPoint2D(rebar.right[1], rebar.right[0], 200)
    if (lowerSlabRebarPoints){
        let nPt1 = multiLineIntersect(lowerSlabRebarPoints, [rebar.left[1], rebar.left[0]]);
        let nPt2 = multiLineIntersect(lowerSlabRebarPoints, [rebar.right[1], rebar.right[0]]);
        pt1 = nPt1??pt1;
        pt2 = nPt2??pt2;
    }
    if (sectionName.includes("좌")) {
        topRebar = [
            [
                { x: pt1.x + 100, y: pt1.y ,z : 0},
                pt1,
                ...rebar.left, ...rebar.right.slice().reverse(),
                pt2,
                { x: pt2.x + 100, y: pt2.y, z : 0 },

            ]
        ];
    } else {
        // console.log("우10", rebar, section2D) //뭔가 잘못나와서 확인이 필요함
        topRebar = [
            [
                { x: pt1.x - 100, y: pt1.y, z : 0 },
                pt1,
                ...rebar.left, ...rebar.right.slice().reverse(),
                pt2,
                { x: pt2.x - 100, y: pt2.y, z : 0 },
            ]
        ];
    }
    let shearRebar = []
    // 방호벽 테스트후에 수정해야함
    // if (rebar.all.length > 4) {
    //     if (rebar[1].y - 200 > rebar[rebar.length - 2].y) {
    //         shearRebar.push([
    //             ExtendPoint2D(rebar.left[1], rebar.left[0], rebar.right[0].y - rebar.right[1].y),
    //             rebar.right[1]
    //         ])
    //     }
    //     if (rebar[1].y > rebar[rebar.length - 3].y) {
    //         let h = rebar[1].y - rebar[rebar.length - 3].y
    //         let n = Math.floor(h / 300);
    //         shearRebar.push([
    //             ExtendPoint2D(rebar[1], rebar[0], rebar[rebar.length - 1].y - rebar[rebar.length - 3].y),
    //             rebar[rebar.length - 3]
    //         ])
    //         for (let i = 0; i < n; i++) {
    //             shearRebar.push([
    //                 ExtendPoint2D(rebar[0], rebar[1], - h / (n + 1) * (i + 1)),
    //                 ExtendPoint2D(rebar[rebar.length - 3], rebar[2], - h / (n + 1) * (i + 1))
    //             ])
    //         }
    //     }
    // }
    return { topRebar, shearRebar, rebar }
}

export function BarrierTransRebarGen(section2D, cover, sectionName) {
    let dia = 13

    let isClockWise = true;
    if (sectionName.includes("우")) {
        isClockWise = false;
    }
    let rebar = Polygon2DOffset(section2D, cover + dia, 0, cover + dia, cover + dia, true)[0];
    let height = rebar.left[rebar.left.length-1].y - rebar.left[0].y
    let result = [ 
        rebar.left[rebar.left.length-1], rebar.right[rebar.right.length-1],
    ];
    // if (rebar.length > 4) {
    //     if (rebar[1].y - rebar[rebar.length - 2].y > 200) { //좌우측 높이가 200mm이상 차이가 날때
    //         result.push(ExtendPoint2D(rebar[1], rebar[0], rebar[rebar.length - 1].y - rebar[rebar.length - 2].y))
    //     }
    //     if (rebar.length > 4 && rebar[1].y > rebar[rebar.length - 3].y) {

    //         let h = rebar[1].y - rebar[rebar.length - 3].y
    //         let n = Math.floor(h / 300);
    //         result.push(ExtendPoint2D(rebar[1], rebar[0], rebar[rebar.length - 1].y - rebar[rebar.length - 3].y))
    //         for (let i = 0; i < n; i++) {
    //             result.push(ExtendPoint2D(rebar[0], rebar[1], - h / (n + 1) * (i + 1)))
    //             result.push(ExtendPoint2D(rebar[rebar.length - 3], rebar[2], - h / (n + 1) * (i + 1)))
    //         }
    //     }
    // } else {
        if (height > 400) { //4각 단면이면서 연석 높이가 400이상일 
            result.push(ExtendPoint2D(rebar.left[0], rebar.left[rebar.left.length-1], - height / 2))
            result.push(ExtendPoint2D(rebar.right[0], rebar.right[rebar.right.length - 1], - height / 2))
        }
    // }
    return result
}