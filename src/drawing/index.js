import { GenBoxGirder2DFn } from "./girder";

export function GenBoxGirder2D() {
    this.addInput("girderLayout", "");
    this.addInput("girderStations", "");
    this.addInput("gridPointDict", "");
    this.addInput("sectionPointDict", "");
    this.addInput("steelBoxDict", "");
    this.addInput("mainPartDict", "");
    this.addInput("etcPartDict", "");
    this.addInput("studDict", "");
    this.addInput("layout", "");
    this.addInput("propsGeneral", "");
    this.addInput("propsDetail", "");
    this.addOutput("draw", "");
}

GenBoxGirder2D.title = "GenBoxGirder2D";
GenBoxGirder2D.prototype.onExecute = function () {
    const girderLayout = this.getInputData(0);
    const girderStations = this.getInputData(1);
    const gridPointDict = this.getInputData(2);
    const sectionPointDict = this.getInputData(3);
    const steelBoxDict = this.getInputData(4);
    const mainPartDict = this.getInputData(5);
    const etcPartDict = this.getInputData(6);
    const studDict = this.getInputData(7);
    const layout = this.getInputData(8);
    const propsGeneral = this.getInputData(9);
    const propsDetail = this.getInputData(10);

    let draw = GenBoxGirder2DFn(
        girderLayout,
        girderStations,
        gridPointDict,
        sectionPointDict,
        steelBoxDict,
        mainPartDict,
        etcPartDict,
        studDict,
        layout,
        propsGeneral,
        propsDetail
    );
    this.setOutputData(0, draw);
};
