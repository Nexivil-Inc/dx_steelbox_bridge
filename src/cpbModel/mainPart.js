import { GetArcPoints, Loft, PointToSkewedGlobal, TwoLineIntersect } from "@nexivil/package-modules";
import { DividingPoint } from "@nexivil/package-modules/src/temp";
import { FilletPoints, SteelBox } from "./3D";
import { DiaShapeDictV2, VstiffShapeDictV2, XbeamDictV2 } from "./diaVstiffXbeam";
import { SplicePlateV2 } from "./etcPart";

export function CPBMainPart(stPointDict, girderStation, sectionPointDict, MainPartInput, MainPartSectionInput, entrance) {
    let stboxModel = SteelBoxModel(girderStation, sectionPointDict, entrance)
    let diaModel = DiaShapeDictV2(stPointDict, sectionPointDict, MainPartInput.point.D, MainPartSectionInput.dia, null)
    let vModel = VstiffShapeDictV2(stPointDict, sectionPointDict, MainPartInput.point.V, MainPartSectionInput.vStiff, null)
    let xbeamModel = XbeamDictV2(stPointDict, sectionPointDict, MainPartInput.xbeamLayout, MainPartSectionInput.xBeam, null)
    let spliceModel = SplicePlateV2(stPointDict, sectionPointDict, MainPartInput.point.SP, MainPartSectionInput.splice)
    return [...stboxModel['children'], ...diaModel.diaDict['children'], ...vModel['children'],...xbeamModel.xbeamDict['children'], ...spliceModel['children']]
}

export function SteelBoxModel(girderStation, sectionPointDict, entrance) {
    let bottomConcDict = {};
    let result = { parent: [], children: [] }
    let pk1 = "";
    let pk2 = "";
    let UFi = 1;
    let Bi = 1;
    let Wi = 1;
    // let RWi = 1;
    let lRibi = 1;
    let uRibi = 1;
    let lConci = 1;
    // let lConcSidei = 1;
  
    let keyname = "";
    let splicer = [];
    // let sideKeyname = "";
    let endCutFilletR = 200;
  
    for (let i in girderStation) {
      let segNum = 1
      let segName = "G" + (i * 1 + 1).toFixed(0) + "SEG" + segNum.toString()
      let topPoints = [[], [], []];
      let bottomPoints = [[], [], []];
      let leftWebPoints = [[], [], []];
      let rightWebPoints = [[], [], []];
      let topRibPoints = [];
      let bottomRibPoints = [];
      let bottomConcPoints = [];
      let bottomConcGridPoints = [];
      let uflangePointList = [];
      let lflangePointList = [];
      // steelBoxDict2[segName] = {};
      for (let j = 0; j < girderStation[i].length - 1; j++) {
        let point1 = girderStation[i][j].point;
        let point2 = girderStation[i][j + 1].point;
        pk1 = girderStation[i][j].key
        pk2 = girderStation[i][j + 1].key
  
        if (pk1.includes("SP")) {
          segNum += 1
          segName = "G" + (i * 1 + 1).toFixed(0) + "SEG" + segNum.toString()
          // steelBoxDict2[segName] = {};
        }
        let L1 = []; //sectionPointDict[pk1].forward.leftTopPlate
        let L2 = []; //sectionPointDict[pk2].backward.leftTopPlate
        let L3 = []; //sectionPointDict[pk2].forward.leftTopPlate
        let L1S = []; //sectionPointDict[pk1].forward.leftTopPlate
        let L2S = []; //sectionPointDict[pk2].backward.leftTopPlate
        let L3S = []; //sectionPointDict[pk2].backward.leftTopPlate
  
        keyname = "G" + (i * 1 + 1).toString() + "TopPlate" + UFi
        splicer = ["TF", "SP", "K6"]
        let uflangePoint = steelPlateGenerator(sectionPointDict, pk1, pk2, point1, point2, "uflange", splicer, endCutFilletR)
        uflangePointList.push(uflangePoint)

        splicer.forEach(function (sp) {
          if (pk2.slice(2, 4) === sp) { //거대 개수 9개 제한 
            result["children"].push(new SteelBox(GirderPoints(uflangePointList), sectionPointDict[pk1].forward.input.tuf, null, 'steelBox', 
            {group: 'Girder' + String(i*1+1), part: segName, key: keyname, girder: i * 1 + 1, seg: segNum, }))
                
            UFi += 1;
            //initiallize
            topPoints = [[], [], []];
            uflangePointList = [];
            return
          }
        })
  
        keyname = "G" + (i * 1 + 1).toString() + "BottomPlate" + Bi
        splicer = ["BF", "SP", "K6"]
        let lflangePoint = steelPlateGenerator(sectionPointDict, pk1, pk2, point1, point2, "lflange", splicer, endCutFilletR)
        lflangePointList.push(lflangePoint)

        splicer.forEach(function (sp) {
          if (pk2.slice(2, 4) === sp) {
            result["children"].push(new SteelBox(GirderPoints(lflangePointList), sectionPointDict[pk1].forward.input.tlf, null, 'steelBox', 
            {group: 'Girder' + String(i*1+1), part: segName, key: keyname, girder: i * 1 + 1, seg: segNum, }))

            Bi += 1;
            bottomPoints = [[], [], []];
            lflangePointList = [];
            return
          }
        })
        splicer = ["WF", "SP", "K6"];
        let leftwebPlate = webPlateGenerator(sectionPointDict, pk1, pk2, point1, point2, 0, splicer, endCutFilletR, entrance);
        let rightwebPlate = webPlateGenerator(sectionPointDict, pk1, pk2, point1, point2, 1, splicer, endCutFilletR, entrance);
        leftwebPlate.forEach((el, i) => leftWebPoints[i].push(...el));
        rightwebPlate.forEach((el, i) => rightWebPoints[i].push(...el));
        // webSide.forEach((el, i) => rightWebSidePoints[i].push(...el));
        splicer.forEach(function (sp) {
          if (pk2.slice(2, 4) === sp) {

            result["children"].push(new SteelBox(leftWebPoints, sectionPointDict[pk1].forward.input.tw, null, 'steelBox', 
            {group: 'Girder' + String(i*1+1), part: segName, key: "G" + (i * 1 + 1).toString() + "LeftWeB" + Wi, girder: i * 1 + 1, seg: segNum, }))
            result["children"].push(new SteelBox(rightWebPoints, sectionPointDict[pk1].forward.input.tw, null, 'steelBox', 
            {group: 'Girder' + String(i*1+1), part: segName, key: "G" + (i * 1 + 1).toString() + "RightWeB" + Wi, girder: i * 1 + 1, seg: segNum, }))
            
            Wi += 1;
            leftWebPoints = [[], [], []];
            rightWebPoints = [[], [], []];
            // rightWebSidePoints = [[], [], []];
            return
          }
        })
  
        if (point1.girderStation < point2.girderStation) {
          keyname = "G" + (i * 1 + 1).toString() + "lRib" + lRibi
          L1 = sectionPointDict[pk1].forward.LRib;
          L2 = sectionPointDict[pk2].backward.LRib;
          L3 = sectionPointDict[pk2].forward.LRib;
          if (bottomRibPoints.length < L1.length) { //고유의 키값을 구분하는 방법은?
            L1.forEach(elem => bottomRibPoints.push([]))
          }
          if (L1.length > 0) {
            for (let k in L1) {
              L1[k].forEach(element => bottomRibPoints[k].push(PointToSkewedGlobal(element, point1)));
            }
            if ((L2.length > 0 && L3.length !== L2.length) || pk2.slice(2, 4) === "SP" || pk2.slice(2, 4) === "K6") {
              for (let k in L2) {
                L2[k].forEach(element => bottomRibPoints[k].push(PointToSkewedGlobal(element, point2)));
              }
              result["children"].push(new SteelBox(bottomRibPoints, sectionPointDict[pk1].forward.input.Lrib.thickness, null, 'steelBox', 
              {group: 'Girder' + String(i*1+1), part: segName, key: "G" + (i * 1 + 1).toString() + "lRib" + lRibi, girder: i * 1 + 1, seg: segNum, }))
              lRibi += 1;
              bottomRibPoints = [];
            }
          }
  
          keyname = "G" + (i * 1 + 1).toString() + "uRib" + uRibi
          // if (!steelBoxDict[keyname]) { steelBoxDict[keyname] = { points: [[], [], []] }; };
          L1 = sectionPointDict[pk1].forward.URib;
          L2 = sectionPointDict[pk2].backward.URib;
          L3 = sectionPointDict[pk2].forward.URib;
          if (topRibPoints.length < L1.length) {
            L1.forEach(elem => topRibPoints.push([]))
          };
          if (L1.length > 0) {
            for (let k in L1) {
              L1[k].forEach(element => topRibPoints[k].push(PointToSkewedGlobal(element, point1)));
            }
            if ((L2.length > 0 && L3.length !== L2.length) || pk2.slice(2, 4) === "SP" || pk2.slice(2, 4) === "K6") {
              for (let k in L2) {
                L2[k].forEach(element => topRibPoints[k].push(PointToSkewedGlobal(element, point2)));
              }
              result["children"].push(new SteelBox(topRibPoints, sectionPointDict[pk1].forward.input.Urib.thickness, null, 'steelBox', 
              {group: 'Girder' + String(i*1+1), part: segName, key: keyname, girder: i * 1 + 1, seg: segNum, }))
              uRibi += 1;
              topRibPoints = [];
            }
          }
        }
        // }
        //하부콘크리트 모델
  
        keyname = "G" + (i * 1 + 1).toString() + "lConc" + lConci
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
          let L1Global = []
          L1.forEach(element => L1Global.push(PointToSkewedGlobal(element, point1)));
          bottomConcPoints.push(L1Global)
          bottomConcGridPoints.push({ key: pk1, point: point1 })
        }
        if ((L1.length > 0 && L2.length > 0 && L3.length === 0)) {
          let L2Global = []
          L2.forEach(element => L2Global.push(PointToSkewedGlobal(element, point2)));
          bottomConcPoints.push(L2Global)
          bottomConcGridPoints.push({ key: pk2, point: point2 })
          result["children"].push(new Loft(bottomConcPoints, true, 'slab', 
          {group: 'Girder' + String(i*1+1), part: segName, key: keyname, girder: (i * 1 + 1), seg: segNum}))
          lConci += 1;
          bottomConcPoints = [];
          bottomConcGridPoints = [];
        }
      }
    }
    return result
  }

  function plateCompare(plate1, plate2) {
    let result = true;
    let err = 0.1;
    for (let i in plate1) {
      for (let j in plate1[i]) {
        if (plate2[i][j]) {
          if (Math.abs(plate1[i][j].x - plate2[i][j].x) > err ||
            Math.abs(plate1[i][j].y - plate2[i][j].y) > err
          ) {
            result = false //오류발생, 값이 급격하게 차이나는 경우 입력하는 방법이 있어야함
          }
        } else {
          result = false
        }
      }
    }
    return result
  }
   
  export function steelPlateGenerator(sectionPointDict, pk1, pk2, point1, point2, plateKey, splicer, endCutFilletR) {
    // 박스형 거더의 상하부플레이트 개구와 폐합에 대한 필렛을 위해 개발되었으며, 개구->폐합, 폐합->개구에 대해서만 가능하다, 
    // 개구->폐합->개구로 2단계의 경우에는 오류가 발생할 수 있음, 2020.05.25 by drlim
    let result = [[], [], []];
  
    let filletR = 300; // 외부변수로 나와야함
  
    let uf0 = sectionPointDict[pk1].backward[plateKey];
    let uf1 = sectionPointDict[pk1].forward[plateKey]; 
    let uf2 = sectionPointDict[pk2].backward[plateKey];
    let uf3 = sectionPointDict[pk2].forward[plateKey];
    let FisB = plateCompare(uf2, uf3);  //forward is backward?  
    let FisB0 = plateCompare(uf0, uf1);  //forward is backward?  
    let plate0 = [[], [], []];
    let plate1 = [[], [], []];
    let plate2 = [[], [], []];
    let plate3 = [[], [], []];
    let smoothness = 8
    let former1 = uf0[0][0] ? uf0[0][0].x : uf0[2][0].x //point1.backward
    let latter1 = uf1[0][0] ? uf1[0][0].x : uf1[2][0].x //point1.forward
    let former2 = uf2[0][0] ? uf2[0][0].x : uf2[2][0].x //point2.backward
    let latter2 = uf3[0][0] ? uf3[0][0].x : uf3[2][0].x //point2.forward
    let line1 = uf1[0][0] ? [PointToSkewedGlobal(uf1[0][0], point1),PointToSkewedGlobal(uf1[1][0], point1)]
                          : [PointToSkewedGlobal(uf1[2][0], point1),PointToSkewedGlobal(uf1[2][1], point1)]
    let line2 = uf2[0][0] ? [PointToSkewedGlobal(uf2[0][0], point2),PointToSkewedGlobal(uf2[1][0], point2)]
                          : [PointToSkewedGlobal(uf2[2][0], point2),PointToSkewedGlobal(uf2[2][1], point2)]
    
    let isCross = Boolean(TwoLineIntersect(line1, line2)) && !pk1.includes("K")
    //위의 로직으로 사용시, K값을 가진 변수가 앞에 나오는 경우, 교차하더라도 처리가 되지 않음 20220602 byDrlim
  
    let former3 = uf2[0].length > 0 ? uf2[0][0].y : uf2[2][0].y
    let latter3 = uf3[0].length > 0 ? uf3[0][0].y : uf3[2][0].y
    let former0 = uf0[0][0] ? uf0[0][0].y : uf0[2][0].y
    let latter0 = uf1[0][0] ? uf1[0][0].y : uf1[2][0].y
    for (let k in uf1) {
      uf0[k].forEach(element => plate0[k].push(PointToSkewedGlobal(element, point1)));
      uf1[k].forEach(element => plate1[k].push(PointToSkewedGlobal(element, point1)));
      uf2[k].forEach(element => plate2[k].push(PointToSkewedGlobal(element, point2)));
      uf3[k].forEach(element => plate3[k].push(PointToSkewedGlobal(element, point2)));
    }
    if (point2.mainStation > point1.mainStation) {
      // outborder 
      if (!plateCompare(uf0, uf1)) {
        if (former1 < latter1) { //point1에서 좁아지는 경우
          if (uf1[2][0]) { //폐합에서 폐합인 경우
            try {
              plate1[2][0] = DividingPoint(plate1[2][0], plate2[2][0], (latter1 - former1) * 2) //숫자 2는 확폭시 경사도
              plate1[2][1] = DividingPoint(plate1[2][1], plate2[2][1], (latter1 - former1) * 2)
              plate1[2][2] = DividingPoint(plate1[2][2], plate2[2][2], (latter1 - former1) * 2)
              plate1[2][3] = DividingPoint(plate1[2][3], plate2[2][3], (latter1 - former1) * 2)
            } catch (e) {
              console.log("플레이트가 분할 폐합 과정중에 오류 발생")
            }
            if (!uf0[2][0]) { //point1.backward가 개구인경우, 개구에서 폐합으로 갈경우
              plate0[2][0] = plate0[0][0]
              plate0[2][1] = plate0[1][0]
              plate0[2][2] = plate0[1][3]
              plate0[2][3] = plate0[0][3]
              plate0[0] = [];
              plate0[1] = [];
            }
          }
          for (let k in uf1) {
            plate0[k].forEach(element => result[k].push(element)); //개구에서 개구로 좁아지는 경우 폐합에서 개구로 좁아지는 경우 오류발생
          }
        }
      }
  
      if (uf1[2].length === 0 && uf0[2].length > 0) {  //폐합에서 분할로 시작 // 외측과 내측필렛이 같은요소에 작용하면 오류가 발생할 것으로 예상, 필렛이 없는 폐합요소에만 외측 챔퍼 적용
        let filletPoints = FilletPoints(plate1, plate2, false, filletR, smoothness)
        result[0].push(...filletPoints[0])
        result[1].push(...filletPoints[1])
        // result[2].push(...plate0[2]) //임시삭제, 폐합과 개구단면이 동시에 존재하게됨 ==> 이동
      } else { //폐합=>폐합 or 분할=>폐합 or 분할=>분할
        if (!FisB0 && ((latter0 - former0) > 100) && ((latter0 - former0) < 700)) { //단부절취인경우
          //단부에서 오류나는 내용 임시적으로 해결 2020.7.13 by dr.lim
          for (let k in uf1) {
            if (uf1[k].length > 0) {
              let thickness = Math.abs(uf1[k][0].y - uf1[k][3].y);
              let npt2 = DividingPoint(plate1[k][2], plate2[k][2], thickness);
              let npt3 = DividingPoint(plate1[k][3], plate2[k][3], thickness);
              let nplate1 = [plate1[k][0], plate1[k][1], npt2, npt3];
              let nplate2 = [plate0[k][3], plate0[k][2], { x: npt2.x, y: npt2.y, z: plate0[k][2].z }, { x: npt3.x, y: npt3.y, z: plate0[k][3].z }];
              let filletList = [[], [], [], []];
              for (let l = 0; l < 4; l++) {
                let radius = l < 2 ? endCutFilletR : endCutFilletR - thickness;
                filletList[l].push(... GetArcPoints(nplate2[l], nplate1[l], plate2[k][l], radius, 8));
              }
              result[k].push(...nplate2);
              for (let l in filletList[0]) {
                result[k].push(filletList[0][l], filletList[1][l], filletList[2][l], filletList[3][l]);
              }
              // result[k].push(plate2[k][0],plate2[k][1],npt2, npt3)
            }
          }
        } else { //단부절취가 아닌경우 일반경우 해당
          for (let k in uf1) {
            if (!isCross){
              plate1[k].forEach(element => result[k].push(element));
            } else {
              console.log("플랜지 단면교차로 인한 삭제 : ", pk1 )
            }
          }
        }
      }
      
      if (uf2[2].length === 0 && uf3[2].length > 0) { // point2 분할에서 폐합으로
        let filletPoints = FilletPoints(plate1, plate2, true, filletR, smoothness)
        result[0].push(...filletPoints[0])
        result[1].push(...filletPoints[1])
      } else { //point2 폐합=>분할, 폐합=>폐합, 분할=>분할
        let spCheck = false
        splicer.forEach(function (sp) { if (pk2.substr(2, 2) === sp) { spCheck = true } })
        if (!FisB && ((former3 - latter3) > 100) && ((former3 - latter3) < 700)) { // 단부절취인 경우 단부에서 오류나는 내용 임시적으로 해결 2020.7.13 by dr.lim
          for (let k in uf2) {
            if (uf2[k].length > 0) {
              let thickness = Math.abs(uf2[k][0].y - uf2[k][3].y);
              let npt2 = DividingPoint(plate2[k][2], plate1[k][2], thickness);
              let npt3 = DividingPoint(plate2[k][3], plate1[k][3], thickness);
              let nplate1 = [plate2[k][0], plate2[k][1], npt2, npt3];
              let nplate2 = [plate3[k][3], plate3[k][2], { x: npt2.x, y: npt2.y, z: plate3[k][2].z }, { x: npt3.x, y: npt3.y, z: plate3[k][3].z }];
              let filletList = [[], [], [], []];
              for (let l = 0; l < 4; l++) {
                let radius = l < 2 ? endCutFilletR : endCutFilletR - thickness;
                filletList[l].push(...GetArcPoints(plate1[k][l], nplate1[l], nplate2[l], radius, 8));
              }
              for (let l in filletList[0]) {
                result[k].push(filletList[0][l], filletList[1][l], filletList[2][l], filletList[3][l]);
              }
              // result[k].push(plate2[k][0],plate2[k][1],npt2, npt3)
              result[k].push(...nplate2);
            }
          }
        }
        let isWiden = false
        if (!FisB) { //point2 앞뒤단면이 상이한경우
          if (former2 > latter2 && pk2.substr(2, 2) !== "K6") { //point2에서 플렌지 폭이 넓어지는 경우
            if (uf2[2][0]) { ////point2.backward 폐합인경우
              plate2[2][0] = DividingPoint(plate2[2][0], plate1[2][0], (former2 - latter2) * 2)
              plate2[2][1] = DividingPoint(plate2[2][1], plate1[2][1], (former2 - latter2) * 2)
              plate2[2][2] = DividingPoint(plate2[2][2], plate1[2][2], (former2 - latter2) * 2)
              plate2[2][3] = DividingPoint(plate2[2][3], plate1[2][3], (former2 - latter2) * 2)
              if (!uf3[2][0]) { //point2.forward가 개구인경우 폐합=>개구로 가는 경우
                plate3[2][0] = plate3[0][0]
                plate3[2][1] = plate3[1][0]
                plate3[2][2] = plate3[1][3]
                plate3[2][3] = plate3[0][3]
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
            isWiden = true
          }
        }
        if ((spCheck && !isWiden) || (uf3[2].length === 0 && uf2[2].length > 0)) {  //형고 높이가 100mm 이상인 경우에만 반영 //폭이 넓어지는 경우에는 이미 선반영이 되어 있어 제외함.
          for (let k in uf2) {
            plate2[k].forEach(element => result[k].push(element)); 
          }
        }
  
      }
    } else { //
      splicer.forEach(function (sp) {
        if (pk2.substr(2, 2) === sp) {
          for (let k in uf2) {
            plate2[k].forEach(element => result[k].push(element));
          }
        }
      })
    }
    return result
  }

  function GirderPoints(flangePointList){
    let openStatusList = [];
    let openStatus = undefined;
    let points = [[],[],[]]
    let add = 0;
    for (let i = 0; i<flangePointList.length;i++){
      if (flangePointList[i][2].length>0){
        openStatus = false
      } else if (flangePointList[i][0].length>0){
        openStatus = true
      }
      if (openStatusList[openStatusList.length-1]===false && openStatus === true){
        points.push([],[],[])
        add = 3;
      }  
      flangePointList[i].forEach((el, j) => points[j + add].push(...el))
      if (openStatus !== undefined){
        openStatusList.push(openStatus)
      }
    }
    return points
  }

  function webPlateGenerator(sectionPointDict, pk1, pk2, point1, point2, webIndex, splicer, endCutFilletR, entrance) {
    let result = [[], [], []]
    let L0 = sectionPointDict[pk1].backward.web[webIndex];
    let L1 = sectionPointDict[pk1].forward.web[webIndex];
    let L2 = sectionPointDict[pk2].backward.web[webIndex];
    let L3 = sectionPointDict[pk2].forward.web[webIndex];
  
    let wplate0 = [];
    let wplate1 = [];
    let wplate2 = [];
    let wplate3 = [];
    L0.forEach(element => wplate0.push(PointToSkewedGlobal(element, point1)))
    L1.forEach(element => wplate1.push(PointToSkewedGlobal(element, point1)))
    L2.forEach(element => wplate2.push(PointToSkewedGlobal(element, point2)))
    L3.forEach(element => wplate3.push(PointToSkewedGlobal(element, point2)))
  
    let line1 = [point1, wplate1[0]]
    let line2 = [point2, wplate2[0]]
    let isCross = Boolean(TwoLineIntersect(line1, line2)) && !pk1.includes("K")
    
  
    if (point2.mainStation > point1.mainStation) {
      if (pk1.substr(2, 2) === "K1" && entrance.add) {
        let ent = webEntrance(wplate1, wplate2, true, entrance)
        for (let k in ent) {
          ent[k].forEach(element => result[k].push(element));
        }
      } else {
        let indent = (L1[0].y - L0[0].y) // bottom point of web
        if (indent > 100 && indent < 700) {
          let fpt = GetArcPoints(wplate0[0], wplate1[0], wplate2[0], endCutFilletR, 8);
          let fpt3 = GetArcPoints(wplate0[3], wplate1[3], wplate2[3], endCutFilletR, 8);
          for (let l in fpt) {
            result[2].push(fpt[l], wplate1[1], wplate1[2], fpt3[l])
          }
        } else {
          // L1.forEach(element => steelBoxDict[keyname]["points"][2].push(PointToSkewedGlobal(point1, element)))
          if (!isCross){
            wplate1.forEach(element => result[2].push(element));
          } else {
            console.log("복부판 단면교차로 인한 삭제 : ", pk1 )
          }
        }
      }
      let FisB = true;
      for (let i in L2) { if (L2[i] !== L3[i]) { FisB = false } }
      let spCheck = false
      splicer.forEach(function (sp) { if (pk2.substr(2, 2) === sp) { spCheck = true } })
      if (!FisB || spCheck) {
        if (pk2.substr(2, 2) === "K6" && entrance.add) {
          let ent = webEntrance(wplate2, wplate1, false, entrance)
          for (let k in ent) {
            ent[k].forEach(element => result[k].push(element));
          }
        }
        else {
          let indent = (L2[0].y - L3[0].y) // bottom point of web
          if (indent > 100 && indent < 700) {
            let fpt = GetArcPoints(wplate1[0], wplate2[0], wplate3[0], endCutFilletR, 8);
            let fpt3 = GetArcPoints(wplate1[3], wplate2[3], wplate3[3], endCutFilletR, 8);
            for (let l in fpt) {
              result[2].push(fpt[l], wplate2[1], wplate2[2], fpt3[l])
            }
          } else {
            wplate2.forEach(element => result[2].push(element));
          }
        }
      }
    } else { //
      splicer.forEach(function (sp) {
        if (pk2.substr(2, 2) === sp) {
          wplate2.forEach(element => result[2].push(element));
        }
      })
    }
    return result
  }

  function webEntrance(wplate1, wplate2, isForward, entrance) {
    let result = [[], [], []]
    // let b1 = 300;
    // let h1 = 1100;
    // let d1 = 250;
    // let r = 150;
    let b1 = entrance.b1;
    let h1 = entrance.h1;
    let d1 = entrance.d1;
    let r = entrance.r;
    let smoothness = 8;
    // let wplate1 = [];
    // let wplate2 = [];
    // L1.forEach(element => wplate1.push(ToGlobalPoint(point1, element)))
    // L2.forEach(element => wplate2.push(ToGlobalPoint(point2, element)))
    let dpt0 = DividingPoint(wplate1[0], wplate2[0], d1)
    let dpt1 = DividingPoint(wplate1[1], wplate2[1], d1)
    let dpt2 = DividingPoint(wplate1[2], wplate2[2], d1)
    let dpt3 = DividingPoint(wplate1[3], wplate2[3], d1)
    let l1 = DividingPoint(wplate1[0], wplate1[1], b1 + h1)
    let l2 = DividingPoint(wplate1[3], wplate1[2], b1 + h1)
    let r1 = DividingPoint(wplate1[0], wplate1[1], b1)
    let r2 = DividingPoint(wplate1[3], wplate1[2], b1)
    let l11 = DividingPoint(dpt0, dpt1, b1 + h1)
    let l21 = DividingPoint(dpt3, dpt2, b1 + h1)
    let r11 = DividingPoint(dpt0, dpt1, b1)
    let r21 = DividingPoint(dpt3, dpt2, b1)
  
    let newPlate1 = [[wplate1[0], r1, r2, wplate1[3]], [wplate1[1], l1, l2, wplate1[2]], []]
    let newPlate2 = [[dpt0, r11, r21, dpt3], [dpt1, l11, l21, dpt2], []]
    if (isForward) {
      let filletPoints = FilletPoints(newPlate1, newPlate2, isForward, r, smoothness)
      result[0].push(wplate1[0], r1, r2, wplate1[3])
      result[0].push(...filletPoints[0])
      result[1].push(wplate1[1], l1, l2, wplate1[2])
      result[1].push(...filletPoints[1])
    }
    else {
      let filletPoints = FilletPoints(newPlate2, newPlate1, isForward, r, smoothness)
      result[0].push(...filletPoints[0])
      result[0].push(wplate1[0], r1, r2, wplate1[3])
      result[1].push(...filletPoints[1])
      result[1].push(wplate1[1], l1, l2, wplate1[2])
    }
    // steelBoxDict[keyname]["points"][0].push(dpt0, r11, r21, dpt3)
    // steelBoxDict[keyname]["points"][1].push(dpt1, l11, l21, dpt2)
    result[2].push(dpt0, dpt1, dpt2, dpt3)
    return result
  }