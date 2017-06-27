import {describe, beforeEach, it, sinon, expect, angularMocks} from 'test/lib/common';

import _ from 'lodash';
import {DashboardRow} from '../row/row_model';

describe.only('when resizing panels', function() {
  var row;

  beforeEach(() => {
    row = new DashboardRow({});
  });

  it("should resize panels to fill row", () => {
    row.panels = [{span: 1, autoresize: true}];
    row.resizePanels();
    expect(row.panels[0].span).to.be(12);
  });

  it("should resize panels to same size", () => {
    row.panels = [{span: 1, autoresize: true},
                  {span: 1, autoresize: true},
                  {span: 1, autoresize: true}];
    row.resizePanels();
    expect(row.panels[0].span).to.be(4);
    expect(row.panels[1].span).to.be(4);
    expect(row.panels[2].span).to.be(4);
  });

  it("should respect minSpan", () => {
    row.panels = [{span: 1, autoresize: true, minSpan: 6},
                  {span: 1, autoresize: true},
                  {span: 1, autoresize: true}];
    row.resizePanels();
    expect(row.panels[0].span).to.be(6);
    expect(row.panels[1].span).to.be(3);
    expect(row.panels[2].span).to.be(3);
  });

  it("should only resize panels with autoresize", () => {
    row.panels = [{span: 1, autoresize: false},
                  {span: 1, autoresize: true}];
    row.resizePanels();
    expect(row.panels[0].span).to.be(1);
    expect(row.panels[1].span).to.be(11);
  });

  it("should overflow into a second row if necessary", () => {
    row.panels = [{span: 1, autoresize: true, minSpan: 8},
                  {span: 1, autoresize: true, minSpan: 8},
                  {span: 1, autoresize: true, minSpan: 4}];
    row.resizePanels();
    expect(row.panels[0].span).to.be(12);
    expect(row.panels[1].span).to.be(8);
    expect(row.panels[2].span).to.be(4);
  });

  /*it("should resize clones to the same size", () => {
    row.panels = [{span: 1, autoresize: false},
                  {span: 1, autoresize: true, id: 1},
                  {span: 1, autoresize: true, repeatPanelId: 1}];
    row.resizePanels();
    expect(row.panels[0].span).to.be(1);
    expect(row.panels[1].span).to.be(5);
    expect(row.panels[2].span).to.be(5);
  });*/
});
