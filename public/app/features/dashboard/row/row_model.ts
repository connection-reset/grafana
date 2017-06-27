///<reference path="../../../headers/common.d.ts" />

import _ from 'lodash';
import {Emitter, contextSrv, appEvents, assignModelProperties} from 'app/core/core';

export class DashboardRow {
  panels: any;
  title: any;
  showTitle: any;
  titleSize: any;
  events: Emitter;
  span: number;
  height: number;
  collapse: boolean;

  defaults = {
    title: 'Dashboard Row',
    panels: [],
    showTitle: false,
    titleSize: 'h6',
    height: 250,
    isNew: false,
    repeat: null,
    repeatRowId: null,
    repeatIteration: null,
    collapse: false,
  };

  constructor(private model) {
    assignModelProperties(this, model, this.defaults);
    this.events = new Emitter();
    this.updateRowSpan();
  }

  getSaveModel() {
    this.model = {};
    assignModelProperties(this.model, this, this.defaults);

    // remove properties that dont server persisted purpose
    delete this.model.isNew;
    return this.model;
  }

  updateRowSpan() {
    this.span = 0;
    for (let panel of this.panels) {
      this.span += panel.span;
    }
  }

  panelSpanChanged(alwaysSendEvent?) {
    this.resizePanels();
    var oldSpan = this.span;
    this.updateRowSpan();

    if (alwaysSendEvent || oldSpan !== this.span) {
      this.events.emit('span-changed');
    }
  }

  addPanel(panel) {
    console.log("addPanel");
    this.panels.push(panel);
    this.events.emit('panel-added', panel);
    this.panelSpanChanged();
  }

  resizePanels() {
    console.log("resizePanels");
    var resize = function(panels) {
      var resizeablePanels = _.filter(panels, {autoresize: true});
      var fixedSpanPanels = _.filter(panels, {autoresize: false});
      var availableRowSpan = _.reduce(fixedSpanPanels, (acc, p) => {return acc - p.span;}, 12);

      _.each(resizeablePanels, p => {
        p.span = p.minSpan || 1;
        availableRowSpan -= p.span;
      });

      for (var _c = 0; _c < 100; _c++) {
        var groups = [];
        _.each(resizeablePanels, p => {
          if (groups[p.span] === undefined) {
            groups[p.span] = [];
          }
          groups[p.span].push(p);
        });

        var spans = [];
        _.each(Object.keys(groups), i => {
          spans.push(parseInt(i));
        });
        spans.sort();

        if (spans.length > 1) {
          for (var _i = 0; _i < groups[spans[0]].length; _i++) {
            var p = groups[spans[0]][_i];
            var span = Math.min(p.span + Math.floor(availableRowSpan / (groups[spans[0]].length - _i)), spans[1]);
            if (span <= 0) {
              span = 1;
            }
            if (span < p.minSpan) {
              span = p.minSpan;
            }
            availableRowSpan += (p.span - span);
            p.span = span;
          }
        } else {
          for (var _j = 0; _j < groups[spans[0]].length; _j++) {
            var p2 = groups[spans[0]][_j];
            var span2 = p2.span + Math.floor(availableRowSpan / (groups[spans[0]].length - _j));
            if (span2 <= 0) {
              span2 = 1;
            }
            if (span2 < p2.minSpan) {
              span2 = p2.minSpan;
            }
            availableRowSpan += (p2.span - span2);
            p2.span = span2;
          }
        }
        if (availableRowSpan <= 0) {
          break;
        }
      }
      return availableRowSpan;
    };

    var rows = [this.panels.slice()];
    console.log(rows);
    for (var _k = 0; _k < 100; _k++) {
      var toolong = -1;
      for (var _l = 0; _l < rows.length; _l++) {
        var r = resize(rows[_l]);
        if (r < 0) {
          toolong = _l;
          break;
        }
      }
      if (toolong < 0) {
        break;
      }
      var _pp = rows[toolong].pop();
      if (rows[toolong + 1] === undefined) {
        rows[toolong + 1] = [];
      }
      rows[toolong + 1].unshift(_pp);
      console.log(rows);
    }
    console.log(this.panels);
  }

  removePanel(panel, ask?) {
    if (ask !== false) {
      var text2, confirmText;
      if (panel.alert) {
        text2 = "Panel includes an alert rule, removing panel will also remove alert rule";
        confirmText = "YES";
      }

      appEvents.emit('confirm-modal', {
        title: 'Remove Panel',
        text: 'Are you sure you want to remove this panel?',
        text2: text2,
        icon: 'fa-trash',
        confirmText: confirmText,
        yesText: 'Remove',
        onConfirm: () => {
          this.removePanel(panel, false);
        }
      });
      return;
    }

    var index = _.indexOf(this.panels, panel);
    this.panels.splice(index, 1);
    this.events.emit('panel-removed', panel);
    this.panelSpanChanged();
  }

  movePanel(fromIndex, toIndex) {
    this.panels.splice(toIndex, 0, this.panels.splice(fromIndex, 1)[0]);
  }

  destroy() {
    this.events.removeAllListeners();
  }

  copyPropertiesFromRowSource(source) {
    this.height = source.height;
    this.title = source.title;
    this.showTitle = source.showTitle;
    this.titleSize = source.titleSize;
  }

  toggleCollapse() {
    this.collapse = !this.collapse;
  }
}

