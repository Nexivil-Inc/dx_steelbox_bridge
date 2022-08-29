import { compareTestFn } from "./modules";

export function compareTest() {
    this.addInput("a", "");
    this.addInput("b", "");
    this.addOutput("out", "");
}

compareTest.title = "compareTest";
compareTest.prototype.onExecute = function () {
    const a = this.getInputData(0);
    const b = this.getInputData(1);

    let out = compareTestFn(a, b);

    this.setOutputData(0, out);
};

