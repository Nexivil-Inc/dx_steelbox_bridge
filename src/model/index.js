import { GenXBeamModelFn } from "./crossBeam";
import { GenBarrierModelFn, GenDeckModelFn } from "./deck";
import { GenDiaphragmModelFn } from "./diaphragm";
import { FittingGridInputFn, GenGridAutoDataFn, GenGridInfoFn } from "./grid";
import { GenBasicSectionsFn, GenDefaultETCPartDataFn, GenSectionPointDictFn } from "./section";
import { GenSpliceModelFn } from "./splice";
import { GenSteelBoxModelFn } from "./steelBox";
import { GenVStiffModelFn } from "./verticalStiffner";

export function GenBasicSections() {
    this.addInput("girderLayout", "");
    this.addInput("basicSectionInfo", "");
    this.addOutput("seShape", "");
    this.addOutput("drawing", "");
    this.addOutput("mainPartDefaultInfo", "");
}

GenBasicSections.title = "GenBasicSections";
GenBasicSections.prototype.onExecute = function () {
    const girderLayout = this.getInputData(0);
    const basicSectionInfo = this.getInputData(1);

    let out = GenBasicSectionsFn(girderLayout, basicSectionInfo);

    this.setOutputData(0, out.seShape);
    this.setOutputData(1, out.drawing);
    this.setOutputData(2, out.mainPartDefaultInfo);
};

export function GenGridInfo() {
    this.addInput("girderBaseInfo", "");
    this.addInput("girderLayout", "");
    this.addInput("seShape", "");
    this.addInput("girdInput", "");
    this.addOutput("gridPointDict", "");
    this.addOutput("xbeamGridInfo", "");
    this.addOutput("girderStations", "");
    this.addOutput("centerLineStations", "");
}

GenGridInfo.title = "GenGridInfo";
GenGridInfo.prototype.onExecute = function () {
    const girderBaseInfo = this.getInputData(0);
    const girderLayout = this.getInputData(1);
    const seShape = this.getInputData(2);
    const gridInput = this.getInputData(3);

    let result = GenGridInfoFn(girderBaseInfo, girderLayout, seShape, gridInput);

    this.setOutputData(0, result.gridPointDict);
    this.setOutputData(1, result.xbeamGridInfo);
    this.setOutputData(2, result.girderStations);
    this.setOutputData(3, result.centerLineStations);
};

export function GenSectionPointDict() {
    this.addInput("gridPointDict", "");
    this.addInput("girderBaseInfo", "");
    this.addInput("girdInput", "");
    this.addOutput("sectionPointDict", "");
}

GenSectionPointDict.title = "GenSectionPointDict";
GenSectionPointDict.prototype.onExecute = function () {
    const gridPointDict = this.getInputData(0);
    const girderBaseInfo = this.getInputData(1);
    const gridInput = this.getInputData(2);

    let result = GenSectionPointDictFn(girderBaseInfo, gridPointDict, gridInput);

    this.setOutputData(0, result);
};

export function GenDefaultETCPartData() {
    this.addInput("girderStation", "");
    this.addInput("sectionPointDict", "");
    this.addOutput("etcPartDefaultInfo", "");
}

GenDefaultETCPartData.title = "GenDefaultETCPartData";
GenDefaultETCPartData.prototype.onExecute = function () {
    const girderStation = this.getInputData(0);
    const sectionPointDict = this.getInputData(1);
    let out = GenDefaultETCPartDataFn(girderStation, sectionPointDict);
    this.setOutputData(0, out);
};

export function FittingGridInput() {
    this.addInput("gridInput", "");
    this.addOutput("out", "");
}

FittingGridInput.title = "FittingGridInput";
FittingGridInput.prototype.onExecute = function () {
    const gridInput = this.getInputData(0);
    let out = FittingGridInputFn(gridInput);
    this.setOutputData(0, out);
};

export function GenSteelBoxModel() {
    this.addInput("girderStationList", "");
    this.addInput("sectionPointDict", "");
    this.addInput("entrance", "");
    this.addOutput("model", "");
}

GenSteelBoxModel.title = "GenSteelBoxModel";
GenSteelBoxModel.prototype.onExecute = function () {
    const girderStationList = this.getInputData(0);
    const sectionPointDict = this.getInputData(1);
    const entrance = this.getInputData(2);

    let result = GenSteelBoxModelFn(girderStationList, sectionPointDict, entrance);

    this.setOutputData(0, result);
};

export function GenDiaphragmModel() {
    this.addInput("gridPoint", "");
    this.addInput("sectionPointDict", "");
    this.addInput("diaphragmLayout", "");
    this.addInput("diaphragmSectionList", "");
    this.addOutput("model", "");
    this.addOutput("xbeamData", "");
}

GenDiaphragmModel.title = "GenDiaphragmModel";
GenDiaphragmModel.prototype.onExecute = function () {
    const gridPoint = this.getInputData(0);
    const sectionPointDict = this.getInputData(1);
    const diaphragmLayout = this.getInputData(2);
    const diaphragmSectionList = this.getInputData(3);

    let out = GenDiaphragmModelFn(gridPoint, sectionPointDict, diaphragmLayout, diaphragmSectionList);

    this.setOutputData(0, out.model);
    this.setOutputData(1, out.xbeamData);
};

export function GenVStiffModel() {
    this.addInput("gridPoint", "");
    this.addInput("sectionPointDict", "");
    this.addInput("vStiffLayout", "");
    this.addInput("vStiffSectionList", "");
    this.addOutput("model", "");
}

GenVStiffModel.title = "GenVStiffModel";
GenVStiffModel.prototype.onExecute = function () {
    const gridPoint = this.getInputData(0);
    const sectionPointDict = this.getInputData(1);
    const vStiffLayout = this.getInputData(2);
    const vStiffSectionList = this.getInputData(3);

    let out = GenVStiffModelFn(gridPoint, sectionPointDict, vStiffLayout, vStiffSectionList);

    this.setOutputData(0, out.model);
};

export function GenXBeamModel() {
    this.addInput("gridPoint", "");
    this.addInput("sectionPointDict", "");
    this.addInput("xbeamLayout", "");
    this.addInput("xbeamSectionList", "");
    this.addOutput("model", "");
    this.addOutput("xbeamData", "");
}

GenXBeamModel.title = "GenXBeamModel";
GenXBeamModel.prototype.onExecute = function () {
    const gridPoint = this.getInputData(0);
    const sectionPointDict = this.getInputData(1);
    const xbeamLayout = this.getInputData(2);
    const xbeamSectionList = this.getInputData(3);

    let out = GenXBeamModelFn(gridPoint, sectionPointDict, xbeamLayout, xbeamSectionList);
    this.setOutputData(0, out.model);
    this.setOutputData(1, out.xbeamData);
};

export function GenSpliceModel() {
    this.addInput("gridPointDict", "");
    this.addInput("sectionPointDict", "");
    this.addInput("spliceLayout", "");
    this.addInput("spliceSectionList", "");
    this.addOutput("model", "");
}

GenSpliceModel.title = "GenSpliceModel";
GenSpliceModel.prototype.onExecute = function () {
    const gridPointDict = this.getInputData(0);
    const sectionPointDict = this.getInputData(1);
    const spliceLayout = this.getInputData(2);
    const spliceSectionList = this.getInputData(3);

    let out = GenSpliceModelFn(gridPointDict, sectionPointDict, spliceLayout, spliceSectionList);
    this.setOutputData(0, out.model);
};

export function GenDeckModel() {
    this.addInput("girderLayout", "");
    this.addInput("girderBaseInfo", "");
    this.addInput("gridInput", "");
    this.addInput("gridPointDict", "");
    this.addInput("sectionPointDict", "");
    this.addInput("girderStations", "");
    this.addInput("centerLineStations", "");
    this.addInput("xbeamGridInfo", "");
    this.addOutput("model", "");
}

GenDeckModel.title = "GenDeckModel";
GenDeckModel.prototype.onExecute = function () {
    let out = GenDeckModelFn(
        this.getInputData(0),
        this.getInputData(1),
        this.getInputData(2),
        this.getInputData(3),
        this.getInputData(4),
        this.getInputData(5),
        this.getInputData(6),
        this.getInputData(7)
    );
    this.setOutputData(0, out.model);
};

export function GenBarrierModel() {
    this.addInput("girderLayout", "");
    this.addInput("girderBaseInfo", "");
    this.addInput("gridPointDict", "");
    this.addInput("centerLineStations", "");
    this.addInput("slabLayout", "");
    this.addInput("barrierLayoutInput", "");
    this.addInput("barrierSectionDict", "");
    this.addOutput("barrierModel", "");
    this.addOutput("pavementModel", "");
}

GenBarrierModel.title = "GenBarrierModel";
GenBarrierModel.prototype.onExecute = function () {
    let newResult = GenBarrierModelFn(
        this.getInputData(0),
        this.getInputData(1),
        this.getInputData(2),
        this.getInputData(3),
        this.getInputData(4),
        this.getInputData(5),
        this.getInputData(6)
    );
    this.setOutputData(0, newResult.barrierModel);
    this.setOutputData(1, newResult.pavementModel);
};
