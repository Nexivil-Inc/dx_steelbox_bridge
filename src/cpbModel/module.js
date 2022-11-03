import { IntersectionPointOnSpline, LineLength, Point, splineProp, TwoLineIntersect, TwoPointsLength } from "@nexivil/package-modules";
import { THREE } from "global"

export function Polygon2DOffset(pointsArray, topOff=0, bottomOff=0, leftOff=0, rightOff=0) {
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
        let sign = area > 0 ? 1 : -1;
        let segList = [];
        let rads = [];
        for (let i = 0; i< normals.length; i++){
            let j = i < normals.length-1? i+1 : 0;
            let rad = Math.atan2(sign*normals[i][1], sign*normals[i][0])
            let off = 0;
            if (rad >pi/3 && rad<pi*2/3){off = topOff}
            else if (rad > -pi*2/3 && rad < -pi/3){off = bottomOff}
            else if (rad >= pi*2/3 || rad <= -pi*2/3){off = leftOff}
            else if (rad >= -pi/3 && rad <= pi/3){off = rightOff}
            rads.push(rad)            
            segList.push([new Point(nPoints[i].x - sign*normals[i][0] * off,nPoints[i].y - sign*normals[i][1] * off,0),
                new Point(nPoints[j].x - sign*normals[i][0] * off,nPoints[j].y - sign*normals[i][1] * off,0)])
        }
        let part = {all : [], top:[], bottom:[], left:[], right:[]}
        let newRads = [];
        for (let i = 0; i < rads.length; i++) {
            let h = i === 0 ? rads.length - 1 : i - 1;
            // normals[i]와 noramls[j]가 서로 같을 경우에 잘못된 포인트가 생성되기 때문에 이를 해결하기위한 조건문
            if((Math.abs(rads[i] - rads[h]) > tolerance/10) && (TwoPointsLength(segList[i][0], segList[i][1], true)> tolerance)){
                let newPt = TwoLineIntersect(segList[i], segList[h], true, false);
                if (newPt) {
                    part.all.push(newPt);
                } else {
                    part.all.push(segList[i][0]);
                }
                newRads.push(rads[i])
            }
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
            }
        }
        newPointsArray.push(part)
        part["top"].sort(function(a,b){return (a.x - b.x) > tolerance? 1:-1})
        part["bottom"].sort(function(a,b){return (a.x - b.x) > tolerance? 1:-1})
        part["left"].sort(function(a,b){return (a.y - b.y) > tolerance? 1:-1})
        part["right"].sort(function(a,b){return (a.y - b.y) > tolerance? 1:-1})
    }
    return newPointsArray;
}


export function SewPolyline(polyLineList = [], tolerance = 0.1) {
    // const tolerance = 0.1; // unit: mm;
    let resultList = [];
    let originlineSegments = polyLineList.filter(l=> l?.length>0)
    let lineSegments = originlineSegments.filter(seg=>  LineLength(seg) > 0.1)
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
        let segment = [];
        let alist = [];
        faceLines.forEach(function (l1) {
            // resultBool.push(plane1.intersectsLine(line))
            for (let k = 0; k < sliceLine.points.length - 1; k++) {
                let l2 = [sliceLine.points[k], sliceLine.points[k + 1]];
                let l1Length = TwoPointsLength(l1[0], l1[1])
                if(l1Length>0.001){
                    let p = TwoLineIntersect(l1, l2);
                    if (p) {
                        let vec = new Point(l1[1].x - l1[0].x, l1[1].y - l1[0].y, 0);
                        let normalCos = vec.x / l1Length;
                        let normalSin = vec.y / l1Length;
                        p["normalCos"] = normalCos;
                        p["normalSin"] = normalSin;
                        p["skew"] = 0;
                        let newP = IntersectionPointOnSpline(sliceLine, p, null);
                        newP["station"] = sliceLine.points[k].station + splineProp(sliceLine.points[k], newP).length;
                        let a = TwoPointsLength(l1[1], newP) / l1Length;
                        alist.push(a)
                        if (a>=-0.01 && a<1.01){
                            segment.push({ ...newP, z: a * l1[0].z + (1 - a) * l1[1].z });
                            break;
                        } 
                    }
                }
            }
        }
        );
        if (segment.length>2){
            segment.sort((a,b) => a.station - b.station) // console.log("check", segment, alist)
        }
        if (segment.length > 1) {
            if (TwoPointsLength(p3,p1) < 0.001 || TwoPointsLength(p2,p3) < 0.001 ||TwoPointsLength(p1,p2) < 0.001 ){
                // console.log("too closed", p1,p2,p3, segment)
            } else {
                resultPoint.push(segment);
            }
        }
    }
    return resultPoint;
}