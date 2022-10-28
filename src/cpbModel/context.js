import { DegreeToRad, IntersectionPointOnSpline, MainPointGenerator, RadToDegree, splineProp, StPointToParallel, TwoPointsLength } from "@nexivil/package-modules";

export function StGenerator(girderLayout, girderBaseInfo, gridInput) {
    let alignment = girderLayout.alignment
    let end = girderBaseInfo.end;         //단부 바닥판 두께
    let support = girderBaseInfo.support; //연속지점부 바닥판두께
    let sShape = girderBaseInfo.SEShape.start;
    let eShape = girderBaseInfo.SEShape.end;
    const SEShape = {
        "start": { A: sShape.A, D: sShape.B, F: sShape.C, G: sShape.D, isStraight: true, endSlabH: end.SlabH, slabH: support.SlabH },
        "end": { A: eShape.A, D: eShape.B, F: eShape.C, G: eShape.D, isStraight: true, endSlabH: end.SlabH, slabH: support.SlabH }
    }

    let nameToPointDict = {};
    const girderNumber = girderLayout.girderSplines.length
    let pointName = "";
    let offset = 0;
    for (let k = 0; k < 8; k++) {
      switch (k) {
        case 0: offset = SEShape.start.A; break;
        case 1: offset = SEShape.start.A + SEShape.start.D; break;
        case 2: offset = SEShape.start.A + SEShape.start.D + SEShape.start.F; break;
        case 3: offset = SEShape.start.A + SEShape.start.D + SEShape.start.F + SEShape.start.G; break;
        case 4: offset = -(SEShape.end.A + SEShape.end.D + SEShape.end.F + SEShape.end.G); break;
        case 5: offset = -(SEShape.end.A + SEShape.end.D + SEShape.end.F); break;
        case 6: offset = -(SEShape.end.A + SEShape.end.D); break;
        case 7: offset = -(SEShape.end.A); break;
      }
      let mainPoint = k < 4 ? girderLayout.startPoint : girderLayout.endPoint;
      let centerPoint = StPointToParallel(mainPoint, offset, alignment)
  
      for (let i = 0; i < girderNumber; i++) {
        pointName = "G" + (i + 1) + "K" + k;
        nameToPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], centerPoint, alignment, false)
      }
      nameToPointDict["CRK" + k] = centerPoint;
    }
    for (let k in girderLayout.gridKeyPoint) {
      let centerPoint = girderLayout.gridKeyPoint[k];
      for (let i = 0; i < girderNumber; i++) {
        pointName = "G" + (i + 1) + k.slice(2);
        nameToPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], centerPoint, alignment, false)
      }
      nameToPointDict[k] = centerPoint;
    }
    const BenchMark = 0;
    const off = 1;
    for (let key in gridInput.range) {
      if (key !== "LC"){
      for (let i = 0; i < gridInput.range[key].length; i++) {
        let index = 1;
        for (let j = 0; j < gridInput.range[key][i].length - 1; j++) { //반드시 end행이 필요한 이유임, end가 없는 경우 benchmark나 offset에 관계없이 End, 0로 인식해야함
          let elem = gridInput.range[key][i][j];
          pointName = "G" + (i + 1).toFixed(0) + key + String(index);
          if (elem[0] === "" || elem[0] === 0 ) {
            console.log("주요부재단면 입력창에 공백 오류", pointName)
          }  else {
            if (elem[off] * 1 === 0) {
              nameToPointDict[pointName] = nameToPointDict[elem[BenchMark]];
            } else {
              let mianStation = nameToPointDict[elem[BenchMark]].mainStation + elem[off] * 1
              let mainPoint = MainPointGenerator(mianStation, alignment)
              nameToPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], mainPoint, alignment)
            }
            index ++
          }
        }
      }
      }
    }
    for (let key in gridInput.point) {
      for (let i = 0; i < gridInput.point[key].length; i++) {
        for (let j = 0; j < gridInput.point[key][i].length; j++) {
          let elem = gridInput.point[key][i][j]
          pointName = "G" + (i + 1).toFixed(0) + key + (j + 1).toFixed(0);
          if (elem[0] === "" || elem[0] === 0 ) {
            console.log("주요부재배치 입력창에 공백 오류", pointName)
          } else {
            
            if (elem[off] * 1 === 0) {
              nameToPointDict[pointName] = nameToPointDict[elem[BenchMark]];
            } else {
              let skew = elem[3]? DegreeToRad(elem[3] - 90):0;
              let mainStation = nameToPointDict[elem[BenchMark]].mainStation + elem[off] * 1
              let mainPoint = MainPointGenerator(mainStation, alignment, skew)
              nameToPointDict[pointName] = IntersectionPointOnSpline(girderLayout.girderSplines[i], mainPoint, alignment, true)
            }
          }
        }
      }
    }
    //하부콘크리트 별도 관리
    for (let i = 0; i < gridInput.range["LC"].length; i++) {
        
      for (let j = 0; j < gridInput.range["LC"][i].length; j++) {
        let elem = gridInput.range["LC"][i][j]
        pointName = "G" + (i + 1).toFixed(0) + "LC" + (j + 1).toFixed(0);
        if (elem[0] === "" || elem[0] === 0 ) {
          console.log("주요부재단면 입력창에 공백 오류", pointName)
        } else {
         nameToPointDict[pointName+"-1"] = nameToPointDict[elem[0]];
         nameToPointDict[pointName+"-2"] = nameToPointDict[elem[1]];
        }
      }
    }
  
    let i = 0;
    let k0st = nameToPointDict["CRK0"].mainStation
    let k3st = nameToPointDict["CRK3"].mainStation
    let k4st = nameToPointDict["CRK4"].mainStation
    let k7st = nameToPointDict["CRK7"].mainStation
    girderLayout.alignment.points.forEach(function (point) {
      let st = point.mainStation
      if (st > k0st  && st < k3st) {
        nameToPointDict["CRN" + i] = StPointToParallel(nameToPointDict["CRK0"], st - k0st, alignment)
        i++
      } else if (st > k4st  && st < k7st) {

        nameToPointDict["CRN" + i] = StPointToParallel(nameToPointDict["CRK7"], st - k7st, alignment)
        i++
      } else if (st > k3st  && st < k4st){  
        nameToPointDict["CRN" + i] = {...point, skew: 0} 
        i++
      }
    })
  
    return nameToPointDict
  }
  

  export function StationListFn(stPointDict, girderLayout, xbeamLayout) {
    let gs = [];
    let cs = [];
    let alignment = girderLayout.alignment
    //gridPointGenerator로 가도 무방한 코드임 ==>
    let dummyIndex = [];
    let xbeamGrid = [];
    let blockOutH = 150//girderBaseInfo.common.blockOutH
    let blockOutL = 300//girderBaseInfo.common.blockOutL
    for (let k of [["CRK0",1, "CRB0"], ["CRK7",-1,  "CRB7"]]){
      if (blockOutH>0 && blockOutL>0){
        let mainStation = stPointDict[k[0]].mainStation+k[1]*blockOutL;
        let point = StPointToParallel(stPointDict[k[0]],k[1]*blockOutL,alignment)
        cs.push({ station: mainStation, key : k[2], point : point});
      }
  }
  
    for (let i = 0; i < xbeamLayout.length; i++) {
      if (!dummyIndex.includes(i)) {
        let subList = [xbeamLayout[i][0], xbeamLayout[i][1]]
        let nameList = [xbeamLayout[i][2]]
        let a = 1
        let ptName = xbeamLayout[i][1]
        let iter = 0
        while (a && iter < 20) {
          a = xbeamLayout.find(function (el, index) {
            if (el[0] === ptName) {
              dummyIndex.push(index)
              ptName = el[1]
              return true
            }
          })
          iter++
          if (a) {
            subList.push(a[1])
            nameList.push(a[2])
          }
        }
        xbeamGrid.push({ gridPoint: subList, xbeamType: nameList })
      }
    }
    for (let i = 0; i < xbeamGrid.length; i++) {
      let gridNum = xbeamGrid[i].gridPoint.length
      let mainStation = 0;
      let skew = 0;
      let key = "CRX" + (i + 1).toFixed(0);
      for (let j in xbeamGrid[i].gridPoint) {
        mainStation += stPointDict[xbeamGrid[i].gridPoint[j]].mainStation / gridNum
        skew += stPointDict[xbeamGrid[i].gridPoint[j]].skew / gridNum
      }
      let point = MainPointGenerator(mainStation, alignment, skew)
      cs.push({ station: mainStation, key, point })
      stPointDict[key] = point; //<==그리드 포인트에도 추가
    }
    //gridPointGenerator로 가도 무방한 코드임 <==
 
    for (let k in stPointDict) {
      let girderIndex = k.slice(1, 2) - 1 //girder의 개수가 9개까지 한정됨을 가정함
      if (gs.length <= girderIndex) {
        for (let i = 0; i <= girderIndex - gs.length; i++) {
          gs.push([])
        }
      }
  
      if (k.slice(0, 1) === "G") {
        let s = stPointDict[k].mainStation
        if (s >= stPointDict["G" + (girderIndex + 1) + "K1"].mainStation &&
          s <= stPointDict["G" + (girderIndex + 1) + "K6"].mainStation) {
          gs[girderIndex].push({ station: stPointDict[k].mainStation, key: k, point: stPointDict[k] })
        }
      } else { //CR로 생성되는 노드에 대해서 추가됨
        cs.push({ station: stPointDict[k].mainStation, key: k, point: stPointDict[k] })
      }
      if (k.includes("1TW")) {
        let point = MainPointGenerator(stPointDict[k].mainStation, alignment, stPointDict[k].skew)
        cs.push({ station: stPointDict[k].mainStation, key: k, point })
      }
    }
    gs.forEach(function (elem) { elem.sort(function (a, b) { return a.station < b.station ? -1 : 1; }) })
    //곡선구간이나 사교의 경우 마스터스테이션으로 정렬했을 경우 순서가뒤집히는 오류가 발생함
  
    cs.sort(function (a, b) { return a.station < b.station ? -1 : 1; })
  
    let spanLength = []
    for (let i = 0; i < gs.length; i++) {
      let spanNum = 0;
      let totalLength = 0;
      let segLength = 0;
      spanLength.push([0]);
      let dummy0 = {};
      let segNum = 1;
      for (let j = 0; j < gs[i].length; j++) {
        let gridObj = gs[i][j];
        if (j !== 0) { segLength = splineProp(dummy0, gridObj.point).length };
        totalLength += segLength;
        // console.log("totalLength", totalLength)
        dummy0 = gridObj.point;
        gs[i][j]["point"]["girderStation"] = totalLength
        gs[i][j]["point"]["spanNum"] = spanNum
        if (gs[i][j]["key"].includes("K6") || (gs[i][j]["key"].includes("S") && !gs[i][j]["key"].includes("SP"))) {
          spanLength[i].push(totalLength)
          spanNum += 1;
        };
        if (gs[i][j]["key"].includes("SP")) { segNum += 1 }
        gs[i][j]["point"]["segNum"] = segNum;
        gs[i][j]["point"]["girderNum"] = i + 1;
      }
    }
  
    for (let i = 0; i < gs.length; i++) {
      for (let j = 0; j < gs[i].length; j++) {
        gs[i][j]["point"]["spanLength"] = spanLength[i][gs[i][j]["point"]["spanNum"] + 1] - spanLength[i][gs[i][j]["point"]["spanNum"]]
        gs[i][j]["point"]["spanPoint"] = (gs[i][j]["point"]["girderStation"] - spanLength[i][gs[i][j]["point"]["spanNum"]]) / gs[i][j]["point"]["spanLength"]
      }
    }
    return { girder: gs, centerLine: cs, xbeamGrid }
  }

  export function WebPoint(point1, point2, tan1, H) {
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

export function PlateRestPoint(point1, point2, tan1, tan2, thickness) {
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


  export function SectionPointDictFn(stPointDict, girderBaseInfo, mainPartInput) {
    let result = {};
    let slabToGirder = true; //girderBaseInfo.end.isStraight;
    // let slabLayout = gridInput.slabLayout;
    const sectionInfo = {
        B: girderBaseInfo.common.B,
        H: girderBaseInfo.common.H ? girderBaseInfo.common.H : girderBaseInfo.end.H,
        UL: girderBaseInfo.common.T ? girderBaseInfo.common.T / 2 : girderBaseInfo.common.B / 2,
        UR: girderBaseInfo.common.T ? girderBaseInfo.common.T / 2 : girderBaseInfo.common.B / 2,
    }
    for (let k in stPointDict) {
        if (k.slice(0, 1) === "G") {
            let point = stPointDict[k];
            let girderIndex = k.slice(1, 2) - 1; //거더개수 9개 제한
            let baseInput = {}
            let station = point.mainStation;
            let isFlat = girderBaseInfo.common.isFlat;
            let gradient = isFlat ? 0 : point.gradientY;
            let skew = point.skew;
            let pointSectionInfo = PointSectionInfo2(station, skew, mainPartInput, girderIndex, stPointDict);
            // if (k === "G1TW2"){
            //     console.log(pointSectionInfo)
            // }
            // let sectionInfo = girderBaseInfo2[girderIndex].section;

            const centerThickness = girderBaseInfo.support.SlabH + girderBaseInfo.support.HaunchH + girderBaseInfo.common.PavementT; //slabInfo.slabThickness + slabInfo.haunchHeight; //  slab변수 추가
            //   const height = pointSectionInfo.forward.height + centerThickness;
            const lwb = { x: - sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
            const lwt = { x: - sectionInfo.UL, y: - centerThickness };
            const rwb = { x: sectionInfo.B / 2, y: -sectionInfo.H - centerThickness };
            const rwt = { x: sectionInfo.UR, y: -centerThickness };
            let forward = {};
            let backward = {};
            let ps = {};
            // let skew = pointSectionInfo.forward.skew; // gridPoint의 skew가 있어 사용여부 확인후 삭제요망
            for (let i = 0; i < 2; i++) {
                if (i === 0) {
                    ps = pointSectionInfo.forward
                } else {
                    ps = pointSectionInfo.backward
                }

                let bottomY = ps.height + centerThickness;
                let topY = slabToGirder ? ps.slabThickness + ps.haunchH + girderBaseInfo.common.PavementT : centerThickness;
                let LRib = []
                for (let j in ps.lRibLO) {
                    let lRib = [{ x: ps.lRibLO[j] - ps.lRibThk / 2, y: -bottomY },
                    { x: ps.lRibLO[j] - ps.lRibThk / 2, y: -bottomY + ps.lRibH },
                    { x: ps.lRibLO[j] + ps.lRibThk / 2, y: -bottomY + ps.lRibH },
                    { x: ps.lRibLO[j] + ps.lRibThk / 2, y: -bottomY }]
                    LRib.push(lRib);
                }


                let URib = []
                for (let j in ps.uRibLO) {
                    let uRib = [{ x: ps.uRibLO[j] - ps.uRibThk / 2, y: -topY + (ps.uRibLO[j] - ps.uRibThk / 2) * gradient },
                    { x: ps.uRibLO[j] - ps.uRibThk / 2, y: -topY - ps.uRibH + ps.uRibLO[j] * gradient },
                    { x: ps.uRibLO[j] + ps.uRibThk / 2, y: -topY - ps.uRibH + ps.uRibLO[j] * gradient },
                    { x: ps.uRibLO[j] + ps.uRibThk / 2, y: -topY + (ps.uRibLO[j] + ps.uRibThk / 2) * gradient }]
                    URib.push(uRib)
                }
                
                // leftWeb
                let lw1 = WebPoint(lwb, lwt, 0, -bottomY) //{x:blwX,y:-height}
                let lw2 = WebPoint(lwb, lwt, gradient, -topY) //{x:tlwX,y:gradient*tlwX - slabThickness}
                let lWeb = PlateRestPoint(lw1, lw2, 0, gradient, -ps.webThk);
               
                // rightWeb
                let rw1 = WebPoint(rwb, rwt, 0, -bottomY) //{x:brwX,y:-height}
                let rw2 = WebPoint(rwb, rwt, gradient, -topY) //{x:trwX,y:gradient*trwX - slabThickness}
                let rWeb = PlateRestPoint(rw1, rw2, 0, gradient, ps.webThk);
                // bottomplate
                let lflange = [[], [], []];
                let newbl1 = { x: lw1.x - ps.lFlangeC, y: -bottomY };
                let newbl2 = { x: lw1.x - ps.lFlangeC + ps.lFlangeW, y: -bottomY };
                let newbr1 = { x: rw1.x + ps.lFlangeC, y: -bottomY };
                let newbr2 = { x: rw1.x + ps.lFlangeC - ps.lFlangeW, y: -bottomY };
                if (newbl2.x < newbr2.x) { //양측의 플렌지가 서로 중첩될 경우
                    lflange[0] = PlateRestPoint(newbl1, newbl2, null, null, -ps.lFlangeThk);//gradient가 0인 경우, inf에 대한 예외처리 필요
                    lflange[1] = PlateRestPoint(newbr1, newbr2, null, null, -ps.lFlangeThk);
                } else {
                    lflange[2] = PlateRestPoint(newbl1, newbr1, null, null, -ps.lFlangeThk);
                }
                //topPlate
                // let tan = gradient === 0 ? null : -1 / gradient;
                let rad = Math.atan(gradient);
                let cos = Math.cos(rad);
                let sin = Math.sin(rad);
                let uflange = [[], [], []];
                let newtl1 = { x: lw2.x - ps.uFlangeC, y: lw2.y + gradient * (- ps.uFlangeC) };
                let newtl2 = { x: lw2.x - ps.uFlangeC + ps.uFlangeW, y: lw2.y + gradient * (- ps.uFlangeC + ps.uFlangeW) };
                let newtr1 = { x: rw2.x + ps.uFlangeC, y: rw2.y + gradient * (ps.uFlangeC) };
                let newtr2 = { x: rw2.x + ps.uFlangeC - ps.uFlangeW, y: rw2.y + gradient * (ps.uFlangeC - ps.uFlangeW) };

                if (newtl2.x < newtr2.x) { //양측의 플렌지가 서로 중첩될 경우
                    uflange[0] = [newtl1, newtl2, { x: newtl2.x - sin * ps.uFlangeThk, y: newtl2.y + cos * ps.uFlangeThk },
                        { x: newtl1.x - sin * ps.uFlangeThk, y: newtl1.y + cos * ps.uFlangeThk }]
                    uflange[1] = [newtr1, newtr2, { x: newtr2.x - sin * ps.uFlangeThk, y: newtr2.y + cos * ps.uFlangeThk },
                        { x: newtr1.x - sin * ps.uFlangeThk, y: newtr1.y + cos * ps.uFlangeThk }]
                } else {
                    uflange[2] = [newtl1, newtr1, { x: newtr1.x - sin * ps.uFlangeThk, y: newtr1.y + cos * ps.uFlangeThk },
                        { x: newtl1.x - sin * ps.uFlangeThk, y: newtl1.y + cos * ps.uFlangeThk }]
                }
                let uflangeSide = [-topY, -topY + ps.uFlangeThk]
                let lflangeSide = [-bottomY, -bottomY - ps.lFlangeThk]
                let webSide = [-bottomY, -topY]
                // 하부콘크리트는 항상 있는게 아니기 때문에 다른 부재와는 구분이 되어야 할듯함. 21.01.18 by drlim
                let lConc = [];
                let lConcSide = [];
                if (ps.lConcThk > 0) {
                    lConc.push(WebPoint(lwb, lwt, 0, -bottomY), WebPoint(lwb, lwt, 0, -bottomY + ps.lConcThk),
                        WebPoint(rwb, rwt, 0, -bottomY + ps.lConcThk), WebPoint(rwb, rwt, 0, -bottomY))
                    lConcSide.push(-bottomY, -bottomY + ps.lConcThk);
                }
                baseInput = {
                    isDoubleComposite: false, // 추후 PointSectionInfo에 관련 변수 추가
                    isClosedTop: newtl2.x < newtr2.x ? false : true,         //상부플랜지 분리여부, 비분리시 참
                    isSeparated: newbl2.x < newbr2.x ? true : false,         //하부플랜지 분리여부, 분리시 참
                    B1: rw1.x - lw1.x,                                        //강거더 하부 내부폭
                    B2: rw2.x - lw2.x,                                        //강거더 상부 내부폭
                    B3: 3500,  //바닥판 콘크리트 폭                      //슬래브에 대한 정보는 외부에서 받아와야 함
                    wlw: TwoPointsLength(lw1, lw2, true),                       //좌측웹 폭
                    wrw: TwoPointsLength(rw1, rw2, true),                       //우측웹 폭
                    wuf: newtl2.x < newtr2.x ? Math.min(ps.uFlangeW, ps.uFlangeC * 2 - ps.webThk) : newtr1.x - newtl1.x,       //상부플랜지 폭
                    wlf: newbl2.x < newbr2.x ? Math.min(ps.lFlangeW, ps.lFlangeC * 2 - ps.webThk) : newbr1.x - newbl1.x,       //하부플랜지 
                    gradient: gradient,                           //상부플랜지 기울기
                    gradientlf: ps.lFlangeGradient,
                    H: bottomY - topY,                           //강거더 높이
                    tlf: ps.lFlangeThk,                                //하부플랜지 두께
                    tuf: ps.uFlangeThk,                                 //상부플랜지두께
                    tw: ps.webThk,                                      //웹두께
                    Tcu: ps.slabThickness,                              //바닥판콘크리트 두께          
                    Th: ps.haunchH,                                   //헌치두께
                    Tcl: ps.lConcThk,                       //지점콘크리트 두께     //지점콘크리트에 대한 입력 변수 추가
                    blf: ps.lFlangeC,            //하부플랜지 외부폭
                    buf: ps.uFlangeC,             //상부플랜지 외부폭
                    Urib: { thickness: ps.uRibThk, height: ps.uRibH, layout: ps.uRibLO },
                    Lrib: { thickness: ps.lRibThk, height: ps.lRibH, layout: ps.lRibLO },
                    horizontal_bracing: { d0: 2500, vbArea: 50, dbArea: 50 }, //수직보강재 간격, 수평브레이싱 수직, 사재 단면적
                }
                if (i === 0) {
                    forward = {
                        input: baseInput, skew,
                        LRib, URib, uflange, lflange, web: [lWeb, rWeb], uflangeSide, lflangeSide, webSide, lConc, lConcSide
                    }
                } else {
                    backward = {
                        input: baseInput, skew,
                        LRib, URib, uflange, lflange, web: [lWeb, rWeb], uflangeSide, lflangeSide, webSide, lConc, lConcSide
                    }
                }
            }
            result[k] = { forward, backward }
        }
    }
    return result
}

export function PointSectionInfo2(station, skew, gridInput, girderIndex, pointDict) {
    let forward = {
        height: 0,
        slabThickness: 0,
        haunchH: 0,
        skew: skew,
        uFlangeC: 0,//캔틸레버길이를 의미함
        uFlangeW: 0,//
        uFlangeThk: 0,
        lFlangeC: 0,//캘틸레버길이를 의미함
        lFlangeW: 0,//
        lFlangeThk: 0,
        lFlangeGradient: 0,
        webThk: 0,
        uRibH: 0,
        lConcThk: 0,
        uRibThk: 0,
        uRibLO: [],
        lRibH: 0,
        lRibThk: 0,
        lRibLO: [],
    };
    let backward = {
        height: 0,
        slabThickness: 0,
        haunchH: 0,
        skew: skew,
        uFlangeC: 0,
        uFlangeW: 0,
        uFlangeThk: 0,
        lFlangeC: 0,//캘틸레버길이를 의미함
        lFlangeW: 0,//
        lFlangeThk: 0,
        lFlangeGradient: 0,
        webThk: 0,
        lConcThk: 0,
        uRibH: 0,
        uRibThk: 0,
        uRibLO: [],
        lRibH: 0,
        lRibThk: 0,
        lRibLO: [],
    };

    let slabLayout = gridInput.slabLayout;
    let R = 0;
    let x1 = 0;
    let deltaH = 0;
    let L = 0;
    let height = 0;
    let heightb = 0;
    for (let i = 0; i < gridInput.range.H[girderIndex].length; i++) {
        let sName = i === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "H" + (i).toFixed(0);
        let eName = i === gridInput.range.H[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "H" + (i + 1).toFixed(0);
        let sp = pointDict[sName];
        let ep = pointDict[eName];
        if (station >= sp.mainStation && station < ep.mainStation) {
            deltaH = gridInput.range.H[girderIndex][i][2] - gridInput.range.H[girderIndex][i][3]
            L = ep.mainStation - sp.mainStation;
            if (gridInput.range.H[girderIndex][i][4] == "circle") {
                if (deltaH > 0) {
                    R = Math.abs((L ** 2 + deltaH ** 2) / 2 / deltaH)
                    x1 = ep.mainStation - station;
                    height = gridInput.range.H[girderIndex][i][3] + (R - Math.sqrt(R ** 2 - x1 ** 2));
                    forward.lFlangeGradient = x1 / Math.sqrt(R ** 2 - x1 ** 2);
                } else if (deltaH < 0) {
                    R = Math.abs((L ** 2 + deltaH ** 2) / 2 / deltaH)
                    x1 = station - sp.mainStation;
                    height = gridInput.range.H[girderIndex][i][2] + (R - Math.sqrt(R ** 2 - x1 ** 2))
                    forward.lFlangeGradient = -x1 / Math.sqrt(R ** 2 - x1 ** 2);
                } else {
                    height = gridInput.range.H[girderIndex][i][2]
                    forward.lFlangeGradient = 0;
                }
            } else if (gridInput.range.H[girderIndex][i][4] == "parabola") {
                if (deltaH > 0) {
                    x1 = ep.mainStation - station;
                    height = gridInput.range.H[girderIndex][i][3] + deltaH / L ** 2 * x1 ** 2;
                    forward.lFlangeGradient = deltaH / L ** 2 * x1 * 2;
                } else if (deltaH < 0) {
                    x1 = station - sp.mainStation;
                    height = gridInput.range.H[girderIndex][i][2] - deltaH / L ** 2 * x1 ** 2;
                    forward.lFlangeGradient = deltaH / L ** 2 * x1 * 2;
                } else {
                    height = gridInput.range.H[girderIndex][i][2]
                    forward.lFlangeGradient = 0;
                }
            } else {  //straight
                x1 = station - sp.mainStation;
                height = gridInput.range.H[girderIndex][i][2] - x1 / L * deltaH
                forward.lFlangeGradient = deltaH / L;
            }
        }

        if (station > sp.mainStation && station <= ep.mainStation) {
            deltaH = gridInput.range.H[girderIndex][i][2] - gridInput.range.H[girderIndex][i][3];
            L = ep.mainStation - sp.mainStation;
            if (gridInput.range.H[girderIndex][i][4] == "circle") {
                if (deltaH > 0) {
                    R = Math.abs((L ** 2 + deltaH ** 2) / 2 / deltaH)
                    x1 = ep.mainStation - station;
                    heightb = gridInput.range.H[girderIndex][i][3] + (R - Math.sqrt(R ** 2 - x1 ** 2));
                    backward.lFlangeGradient = x1 / Math.sqrt(R ** 2 - x1 ** 2);
                } else if (deltaH < 0) {
                    R = Math.abs((L ** 2 + deltaH ** 2) / 2 / deltaH)
                    x1 = station - sp.mainStation;
                    heightb = gridInput.range.H[girderIndex][i][2] + (R - Math.sqrt(R ** 2 - x1 ** 2))
                    backward.lFlangeGradient = x1 / Math.sqrt(R ** 2 - x1 ** 2);
                } else {
                    heightb = gridInput.range.H[girderIndex][i][2]
                    backward.lFlangeGradient = 0;
                }
            } else if (gridInput.range.H[girderIndex][i][4] == "parabola") {
                if (deltaH > 0) {
                    x1 = ep.mainStation - station;
                    heightb = gridInput.range.H[girderIndex][i][3] + deltaH / L ** 2 * x1 ** 2;
                    backward.lFlangeGradient = deltaH / L ** 2 * x1 * 2;
                } else if (deltaH < 0) {
                    x1 = station - sp.mainStation;
                    heightb = gridInput.range.H[girderIndex][i][2] - deltaH / L ** 2 * x1 ** 2;
                    backward.lFlangeGradient = deltaH / L ** 2 * x1 * 2;
                } else {
                    heightb = gridInput.range.H[girderIndex][i][2]
                    backward.lFlangeGradient = 0;
                }
            } else {  //straight
                x1 = station - sp.mainStation;
                heightb = gridInput.range.H[girderIndex][i][2] - x1 / L * deltaH
                backward.lFlangeGradient = deltaH / L
            }
        }
    }
    forward.height = height;    //
    backward.height = heightb === 0 ? height : heightb;   //형고가 불연속인 경우, 단부절취의 경우 수정이 필요함
    // position:0, T:1, H:2
    let slabThickness = 0;
    for (let i = 0; i < slabLayout.length - 1; i++) {
        let ss = pointDict["G" + (girderIndex + 1).toFixed(0) + slabLayout[i][0].substr(2)].mainStation;
        let es = pointDict["G" + (girderIndex + 1).toFixed(0) + slabLayout[i + 1][0].substr(2)].mainStation
        if (station >= ss && station <= es) {
            let x = station - ss
            let l = es - ss
            slabThickness = slabLayout[i][1] * (l - x) / l + slabLayout[i + 1][1] * (x) / l
            forward.haunchH = slabLayout[i][5] * (l - x) / l + slabLayout[i + 1][5] * (x) / l
            backward.haunchH = slabLayout[i][5] * (l - x) / l + slabLayout[i + 1][5] * (x) / l
        }
        // if (station > ss && station <= es) {
        //     backward.haunchH = slabLayout[i][5] * (l - x) / l + slabLayout[i + 1][5] * (x) / l
        // }

    }
    if (station <= pointDict["G" + (girderIndex + 1).toFixed(0) + slabLayout[0][0].substr(2)].mainStation) {
        slabThickness = slabLayout[0][1]
        forward.haunchH = slabLayout[0][5]
        backward.haunchH = slabLayout[0][5]
    } else if (station >= pointDict["G" + (girderIndex + 1).toFixed(0) + slabLayout[slabLayout.length - 1][0].substr(2)].mainStation) {
        slabThickness = slabLayout[slabLayout.length - 1][1]
        forward.haunchH = slabLayout[slabLayout.length - 1][5]
        backward.haunchH = slabLayout[slabLayout.length - 1][5]
    }

    forward.slabThickness = slabThickness;
    backward.slabThickness = slabThickness;
    let sName = "";
    let eName = ""

    for (let index = 0; index < gridInput.range.TW[girderIndex].length; index++) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TW" + (index);
        eName = index === gridInput.range.TW[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "TW" + (index + 1);
        if (station >= pointDict[sName].mainStation && station < pointDict[eName].mainStation) {
            let uFlange = gridInput.range.TW[girderIndex][index]
            forward.uFlangeW = uFlange[2] + (uFlange[3] - uFlange[2]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation)
            forward.uFlangeC = uFlange[4] + (uFlange[5] - uFlange[4]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation)
            break;
        }
    }
    for (let index = 0; index < gridInput.range.TW[girderIndex].length; index++) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TW" + (index);
        eName = index === gridInput.range.TW[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "TW" + (index + 1);
        if (station > pointDict[sName].mainStation && station <= pointDict[eName].mainStation) {
            let uFlange = gridInput.range.TW[girderIndex][index]
            backward.uFlangeW = uFlange[2] + (uFlange[3] - uFlange[2]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation)
            backward.uFlangeC = uFlange[4] + (uFlange[5] - uFlange[4]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation)
            break;
        }
    }
    var uFlangeT = gridInput.range.TF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TF" + (index);
        eName = index === gridInput.range.TF[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "TF" + (index + 1);
        return (station >= pointDict[sName].mainStation && station < pointDict[eName].mainStation)
    })
    if (uFlangeT.length > 0) {
        forward.uFlangeThk = uFlangeT[0][2]
    }
    uFlangeT = gridInput.range.TF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TF" + (index);
        eName = index === gridInput.range.TF[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "TF" + (index + 1);
        return (station > pointDict[sName].mainStation && station <= pointDict[eName].mainStation)
    })
    if (uFlangeT.length > 0) {
        backward.uFlangeThk = uFlangeT[0][2]
    }
    for (let index = 0; index < gridInput.range.BW[girderIndex].length; index++) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BW" + (index);
        eName = index === gridInput.range.BW[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "BW" + (index + 1);
        if (station >= pointDict[sName].mainStation && station < pointDict[eName].mainStation) {
            let lFlange = gridInput.range.BW[girderIndex][index]
            forward.lFlangeW = lFlange[2] + (lFlange[3] - lFlange[2]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation)
            forward.lFlangeC = lFlange[4] + (lFlange[5] - lFlange[4]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation)
            break;
        }
    }
    for (let index = 0; index < gridInput.range.BW[girderIndex].length; index++) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BW" + (index);
        eName = index === gridInput.range.BW[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "BW" + (index + 1);
        if (station > pointDict[sName].mainStation && station <= pointDict[eName].mainStation) {
            let lFlange = gridInput.range.BW[girderIndex][index]
            backward.lFlangeW = lFlange[2] + (lFlange[3] - lFlange[2]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation)
            backward.lFlangeC = lFlange[4] + (lFlange[5] - lFlange[4]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation)
            break;
        }
    }
    var lFlangeT = gridInput.range.BF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BF" + (index);
        eName = index === gridInput.range.BF[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "BF" + (index + 1);
        return (station >= pointDict[sName].mainStation && station < pointDict[eName].mainStation)
    })
    if (lFlangeT.length > 0) {
        forward.lFlangeThk = lFlangeT[0][2]
    }
    lFlangeT = gridInput.range.BF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BF" + (index);
        eName = index === gridInput.range.BF[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "BF" + (index + 1);
        return (station > pointDict[sName].mainStation && station <= pointDict[eName].mainStation)

    })
    if (lFlangeT.length > 0) {
        backward.lFlangeThk = lFlangeT[0][2]
    }

    var web = gridInput.range.WF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "WF" + (index);
        eName = index === gridInput.range.WF[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "WF" + (index + 1);
        return (station >= pointDict[sName].mainStation && station < pointDict[eName].mainStation)
    })
    if (web.length > 0) {
        forward.webThk = web[0][2]
    }
    web = gridInput.range.WF[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "WF" + (index);
        eName = index === gridInput.range.WF[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "WF" + (index + 1);
        return (station > pointDict[sName].mainStation && station <= pointDict[eName].mainStation)
    })
    if (web.length > 0) {
        backward.webThk = web[0][2]
    }

    try {
        for (let index = 0; index < gridInput.range.LC[girderIndex].length; index++) {
            // sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "LC" + (index);
            // eName = index === gridInput.range.LC[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "LC" + (index + 1);
            sName = gridInput.range.LC[girderIndex][index][0];
            eName = gridInput.range.LC[girderIndex][index][1];
            
            if (station >= pointDict[sName].mainStation && station < pointDict[eName].mainStation) {
                let lConc = gridInput.range.LC[girderIndex][index]
                forward.lConcThk = lConc[2] + (lConc[3] - lConc[2]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation);
                break;
            }
        }

        for (let index = 0; index < gridInput.range.LC[girderIndex].length; index++) {
            // sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "LC" + (index);
            // eName = index === gridInput.range.LC[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "LC" + (index + 1);
            sName = gridInput.range.LC[girderIndex][index][0];
            eName = gridInput.range.LC[girderIndex][index][1];
            if (station > pointDict[sName].mainStation && station <= pointDict[eName].mainStation) {
                let lConc = gridInput.range.LC[girderIndex][index]
                backward.lConcThk = lConc[2] + (lConc[3] - lConc[2]) * (station - pointDict[sName].mainStation) / (pointDict[eName].mainStation - pointDict[sName].mainStation);
                break;
            }
        }
    } catch (e) {
        console.log(station, pointDict, sName, eName)
    }
    var uRib = gridInput.range.TR[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TR" + (index);
        eName = index === gridInput.range.TR[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "TR" + (index + 1);
        return (station >= pointDict[sName].mainStation && station < pointDict[eName].mainStation)
    })
    if (uRib.length > 0) {
        if (uRib[0][2] * uRib[0][3] > 0) {
            forward.uRibThk = uRib[0][2]
            forward.uRibH = uRib[0][3]
            let layout = uRib[0][4] === "" ? [] : isNaN(uRib[0][4]) ? uRib[0][4].split(',') : [uRib[0][4]];
            layout.forEach(elem => forward.uRibLO.push(elem * 1))
        }
    }
    uRib = gridInput.range.TR[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "TR" + (index);
        eName = index === gridInput.range.TR[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "TR" + (index + 1);
        return (station > pointDict[sName].mainStation && station <= pointDict[eName].mainStation)
    })
    if (uRib.length > 0) {
        if (uRib[0][2] * uRib[0][3] > 0) {
            backward.uRibThk = uRib[0][2]
            backward.uRibH = uRib[0][3]
            let layout = uRib[0][4] === "" ? [] : isNaN(uRib[0][4]) ? uRib[0][4].split(',') : [uRib[0][4]];
            layout.forEach(elem => backward.uRibLO.push(elem * 1))
        }
    }

    var lRib = gridInput.range.BR[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BR" + (index);
        eName = index === gridInput.range.BR[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "BR" + (index + 1);
        return (station >= pointDict[sName].mainStation && station < pointDict[eName].mainStation)
    })
    if (lRib.length > 0) {
        if (lRib[0][2] * lRib[0][3] > 0) {
            forward.lRibThk = lRib[0][2]
            forward.lRibH = lRib[0][3]
            let layout = lRib[0][4] === "" ? [] : isNaN(lRib[0][4]) ? lRib[0][4].split(',') : [lRib[0][4]];
            layout.forEach(elem => forward.lRibLO.push(+elem))
        }
    }
    lRib = gridInput.range.BR[girderIndex].filter(function (element, index) {
        sName = index === 0 ? "G" + (girderIndex + 1).toFixed(0) + "K0" : "G" + (girderIndex + 1).toFixed(0) + "BR" + (index);
        eName = index === gridInput.range.BR[girderIndex].length - 1 ? "G" + (girderIndex + 1).toFixed(0) + "K7" : "G" + (girderIndex + 1).toFixed(0) + "BR" + (index + 1);
        return (station > pointDict[sName].mainStation && station <= pointDict[eName].mainStation)
    })
    if (lRib.length > 0) {
        if (lRib[0][2] * lRib[0][3] > 0) {
            backward.lRibThk = lRib[0][2]
            backward.lRibH = lRib[0][3]
            let layout = lRib[0][4] === "" ? [] : isNaN(lRib[0][4]) ? lRib[0][4].split(',') : [lRib[0][4]];
            layout.forEach(elem => backward.lRibLO.push(+elem))
        }
    }

    return { forward, backward }
}