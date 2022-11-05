import { IntersectionPointOnSpline, LineLength, Point, splineCoefficient, splineProp, TwoLineIntersect, TwoPointsLength } from "@nexivil/package-modules";
import { THREE } from "global"

export function Polygon2DOffset(pointsArray, topOff=0, bottomOff=0, leftOff=0, rightOff=0, isSorted = false) {
    let tolerance = 0.01
    let newPointsArray = [];
    let pi = Math.PI;
    for (let points of pointsArray) {
        let area = 0;
        let normals = [];
        let nPoints = [];
        for (let i = 0; i < points.length; i++) {
            let j = i < points.length - 1 ? i + 1 : 0;
            area += ((points[j].x - points[i].x) * (points[j].y + points[i].y)) / 2;
            let normalVec = null;
            let vecLength = TwoPointsLength(points[j], points[i], true);
            if (vecLength > 0.1) {
                normalVec = [-(points[j].y - points[i].y) / vecLength, (points[j].x - points[i].x) / vecLength];
                normals.push(normalVec);
                if (nPoints.length === 0) {
                    nPoints.push(points[i]);
                }
                if (j > 0) {
                    nPoints.push(points[j]);
                }
            }
        }

        let normals2 = [normals[0]];
        let nPoints2 = [nPoints[0]];
        let dump = [];
        let lastPoint = [nPoints[0]];
        for (let i = 1; i< normals.length; i++){
            let h = i === 0 ? normals.length - 1 : i - 1;
            let j = i < normals.length-1? i+1 : 0;
            let cos = normals[h][0]*normals[i][0]+normals[h][1]*normals[i][1]
            if( cos<0.999 &&  cos >-0.9){
                    normals2.push(normals[i])
                    nPoints2.push(nPoints[i])
                    lastPoint = nPoints[i];
            } 
            else if ((TwoPointsLength(lastPoint, nPoints[i]) > 200) && (TwoPointsLength(nPoints[i], nPoints[j]) > 200)){
                normals2.push(normals[i])
                nPoints2.push(nPoints[i])
                lastPoint = nPoints[i];

            } else {
                dump.push(i)
            }
        }
        let sign = area > 0 ? 1 : -1; //clockwise
        let segList = [];
        let rads = [];
        for (let i = 0; i< normals2.length; i++){
            let j = i < normals2.length-1? i+1 : 0;
            let rad = Math.atan2(sign*normals2[i][1], sign*normals2[i][0])
            let off = 0;
            if (rad >pi/3 && rad<pi*2/3){off = topOff}
            else if (rad > -pi*2/3 && rad < -pi/3){off = bottomOff}
            else if (rad >= pi*2/3 || rad <= -pi*2/3){off = leftOff}
            else if (rad >= -pi/3 && rad <= pi/3){off = rightOff}
            rads.push(rad)            
            segList.push([new Point(nPoints2[i].x - sign*normals2[i][0] * off,nPoints2[i].y - sign*normals2[i][1] * off,0),
                new Point(nPoints2[j].x - sign*normals2[i][0] * off,nPoints2[j].y - sign*normals2[i][1] * off,0)])
        }
        let part = {all : [], top:[], bottom:[], left:[], right:[]}
        let newRads = [];
        let lastSeg = segList[rads.length - 1]
        for (let i = 0; i < rads.length; i++) {
            let h = i === 0 ? rads.length - 1 : i - 1;
            if(((Math.abs(rads[i] - rads[h]) > tolerance/10))){
                let newPt = TwoLineIntersect(segList[i], lastSeg, true, false);
                if (newPt) {
                    part.all.push(newPt);
                    newRads.push(rads[i])
                }
            } else {
                if (segList[i][0]){
                    part.all.push(segList[i][0]); //다음 절점이 오프셋 폴리곤 밖에 위치하거면 기존 segList[h]를 유지해야함
                    newRads.push(rads[i])
                } else {
                    console.log("segList Error in Polygon2DOffset", segList[i][0])
                }
            }
            lastSeg = segList[i]
            
        }
        for (let i = 0; i<newRads.length; i++){
            let j = i < newRads.length-1? i+1 : 0;
            let rad = newRads[i]
            let key = ""
            if (rad >pi/3 && rad<pi*2/3){key = "top"}
            else if (rad > -pi*2/3 && rad < -pi/3){key = "bottom"}
            else if (rad >= pi*2/3 || rad <= -pi*2/3){key = "left"}
            else if (rad >= -pi/3 && rad <= pi/3){key = "right"}
            if (part[key].length===0||TwoPointsLength(part[key][part[key].length-1], part.all[i]) > tolerance){
                part[key].push(part.all[i])
            }
            if (part[key].length===0||TwoPointsLength(part[key][part[key].length-1], part.all[j]) > tolerance){
                part[key].push(part.all[j])
            } else {
                console.log("check duplicate")
            }
        }
        newPointsArray.push(part)
        if(isSorted){
        part["top"].sort(function(a,b){return (a.x - b.x) > tolerance? 1:-1})
        part["bottom"].sort(function(a,b){return (a.x - b.x) > tolerance? 1:-1})
        part["left"].sort(function(a,b){return (a.y - b.y) > tolerance? 1:-1})
        part["right"].sort(function(a,b){return (a.y - b.y) > tolerance? 1:-1})
        }
    }
    return newPointsArray;
}


export function SewPolyline(polyLineList = [], tolerance = 0.1) {
    // const tolerance = 0.1; // unit: mm;
    let resultList = [];
    let originlineSegments = polyLineList.filter(l=> l?.length>0)
    let lineSegments0 = originlineSegments.filter(seg=>  LineLength(seg) > 0.001)
    let eraseIndex = [];
    for (let i = 0; i<lineSegments0.length-1;i++){
        for (let j = i+1; j<lineSegments0.length; j++){
            if((TwoPointsLength(lineSegments0[i][0], lineSegments0[j][0])<tolerance &&
            TwoPointsLength(lineSegments0[i][1], lineSegments0[j][1])<tolerance) || 
            (TwoPointsLength(lineSegments0[i][0], lineSegments0[j][1])<tolerance &&
            TwoPointsLength(lineSegments0[i][1], lineSegments0[j][0])<tolerance)){
                eraseIndex.push(j)
            }
            
        }
    }
    let lineSegments = lineSegments0.filter((v,i)=> !eraseIndex.includes(i))
    let index = [...lineSegments.keys()];

    for (let k = 0; k < 20; k++) {
        if (index.length > 0) {
            // console.log(index)
            let result = [...lineSegments[index[0]]];
            index.splice(0, 1);
            let count = index.length; //초기값으로 설정
            for (let i = 0; i < count; i++) {
                for (let j = 0; j < index.length; j++) {
                    if (TwoPointsLength(result[result.length - 1], lineSegments[index[j]][0]) < tolerance) {
                        // console.log("1", result[result.length - 1], lineSegments[index[j]].slice(1))
                        result.push(...lineSegments[index[j]].slice(1));
                        index.splice(j, 1);
                        break;
                    } else if (TwoPointsLength(result[result.length - 1], lineSegments[index[j]][lineSegments[index[j]].length-1]) < tolerance) {
                        // console.log("2", result[result.length - 1], lineSegments[index[j]].reverse().slice(1))
                        result.push(...lineSegments[index[j]].reverse().slice(1));
                        index.splice(j, 1);
                        break;
                    }
                    if (TwoPointsLength(result[0], lineSegments[index[j]][0]) < tolerance) {
                        // console.log("3", result[0], lineSegments[index[j]].slice(1).reverse())
                        result.unshift(...lineSegments[index[j]].slice(1).reverse());
                        index.splice(j, 1);
                        break;
                    } else if (TwoPointsLength(result[0], lineSegments[index[j]][lineSegments[index[j]].length-1]) < tolerance) {
                        // console.log("4", result[0], lineSegments[index[j]].slice(0,-1))
                        result.unshift(...lineSegments[index[j]].slice(0,-1));
                        index.splice(j, 1);
                        break;
                    }
                }
            }
            if (TwoPointsLength(result[0], result[result.length - 1]) < tolerance) {
                result.pop();
            }
            resultList.push(result);
        } else {
            break;
        }
    }
    return resultList;
}
export function InterSectBySpline(geometry, sliceLine) {
    //line의 각도를 통해 절단면을 평면좌표로 변환하는 기능 추가해야함
    const position = geometry.getAttribute("position").array;
    let resultPoint = [];
    for (let i = 0; i < position.length; i += 9) {
        const p1 = new THREE.Vector3(position[i], position[i + 1], position[i + 2]);
        const p2 = new THREE.Vector3(position[i + 3], position[i + 4], position[i + 5]);
        const p3 = new THREE.Vector3(position[i + 6], position[i + 7], position[i + 8]);
        const faceLines = [[p3, p1], [p1, p2], [p2, p3]];
        let pointsOnList = [p1,p2,p3].map(p=> isPointOnSpline(p, sliceLine)).filter(p=> Boolean(p))
        if (pointsOnList.length>0){ //스플라인 선상에 절점이 있는 경우
            console.log("OnSplice", pointsOnList)
        } else {
            let segment = [];
            faceLines.forEach(function (l1) {
                let p = SegementIntersectSpline(l1[0], l1[1], sliceLine); //InterSectionPointOnSplineBySegment(l1, sliceLine)   
                if(p){ 
                    segment.push(p)}
            }
            );
            if (segment.length>2){
                // console.log("threePointInterSect")
                segment.sort((a,b) => a.station - b.station) // console.log("check", segment, alist)
            }
            if (segment.length > 1) {
                if (TwoPointsLength(p3,p1) < 0.001 || TwoPointsLength(p2,p3) < 0.001 ||TwoPointsLength(p1,p2) < 0.001 ){
                    // console.log("too close", p1,p2,p3, segment)
                } else {
                    resultPoint.push(segment);
                }
            }
        }
    }
    return resultPoint;
}

/**
 * 선분이 spline과 교차하는 경우 교차점 출력 교차하지 않으면 null 출력
 * @param {*} point1 
 * @param {*} point2 
 * @param {*} spLine 
 * @returns 
 */
function SegementIntersectSpline(point1, point2, spLine){
    const pts = spLine.points
    for (let i = 0; i<pts.length-1; i++){
        let v = splineCoefficient(pts[i], pts[i+1]);
        let a = v.a2*(point2.y - point1.y) - v.a1*(point2.x - point1.x);
        let b = v.b2*(point2.y - point1.y) - v.b1*(point2.x - point1.x);
        let c = v.c2*(point2.y - point1.y) - v.c1*(point2.x - point1.x) - point1.x*point2.y + point2.x*point1.y;
        let d = b**2 - 4* a * c
        if(d>=0){
            for (let sign of [1,-1]){
                let t = (-b + sign* Math.sqrt(d))/(2*a)
                if(t>=-1 && t<=1){
                    let k = (v.a2*(t**2)+ v.b2*t + v.c2 - point1.x) / (point2.x - point1.x)
                    if (k>=0 && k<=1){
                        let deltaX = 2 * v.a2 * t + v.b2;
                        let deltaY = 2 * v.a1 * t + v.b1;
                        let len = Math.sqrt(deltaX ** 2 + deltaY ** 2);
                        let p = { x : v.a2*(t**2)+ v.b2*t + v.c2, y : v.a1*(t**2)+ v.b1*t + v.c1, z : point1.z*(1-k) + point2.z*k,
                            normalCos : deltaY / len, normalSin : -deltaX / len
                        };
                        p.station = pts[i].station + splineProp(pts[i], p).length;
                        return p
                    }
                }
            }
        }
    }
    return null;
}

/**
 * 절점이 spline평면상에 있으면 station, normalCos, normalSin이 포함된 절점좌표 출력 없는 경우 null 출력
 * @param {*} point 
 * @param {*} spLine 
 * @returns 
 */
function isPointOnSpline(point, spLine){
    const pts = spLine.points
    const err = 0.000001
    for (let i = 0; i<pts.length-1; i++){
        let v = splineCoefficient(pts[i], pts[i+1]);
        let a = v.a2
        let b = v.b2
        let c = v.c2 - point.x
        let d = b**2 - 4* a * c
        if(d>=0){
            for (let sign of [1,-1]){
                let t = (-b + sign* Math.sqrt(d))/(2*a)
                if(t>=-1-err && t<=1+err){
                    if( Math.abs(v.a1*(t**2)+ v.b1*t + v.c1 - point.y)<err){
                        let deltaX = 2 * v.a2 * t + v.b2;
                        let deltaY = 2 * v.a1 * t + v.b1;
                        let len = Math.sqrt(deltaX ** 2 + deltaY ** 2);
                        let check1 = v.a2*(t**2)+ v.b2*t + v.c2 - point.x
                        let check2 = v.a1*(t**2)+ v.b1*t + v.c1 - point.y
                        let p = {...point, normalCos : deltaY / len, normalSin : -deltaX / len,
                        x2 : v.a2*(t**2)+ v.b2*t + v.c2, y2 : v.a1*(t**2)+ v.b1*t + v.c1, t, check1, check2,
                        p1 : pts[i], p2 : pts[i+2]
                        }
                        let p2 = {normalCos : deltaY / len, normalSin : -deltaX / len,
                            x : v.a2*(t**2)+ v.b2*t + v.c2, y : v.a1*(t**2)+ v.b1*t + v.c1
                        }
                        p.station = pts[i].station + splineProp(pts[i], p2).length;
                        return p
                    }
                }
            }
        }
    }
    return null;
}