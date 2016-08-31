///<reference path="../../../headers/common.d.ts" />

import angular from 'angular';
import moment from 'moment';
import config from 'app/core/config';

declare var window: any;

export class ExportCsvCtrl {

  dashboard: any;
  panel: any;

  /** @ngInject */
  constructor(private $scope, private timeSrv, private contextSrv, private backendSrv) {
    $scope.ctrl = this;
  }

  export() {
    console.log("export as csv");
    var timeRange = this.timeSrv.timeRange(true);
    var filename = this.dashboard.meta.slug + "_" +
                   timeRange.from.toISOString() + "-" +
                   timeRange.to.toISOString() + '.csv';
    var orgId = this.contextSrv.user.orgId;
    var queries = [];
    var errors = [];
    // get data sources and measurements from panels
    console.log("get data sources and measurements from panels");
    this.dashboard.forEachPanel(function(panel) {
      panel.targets.forEach( target => {
        if (target.dsType !== "influxdb") {
          // collect all errors and display them later
          var err = "Can't export data from \"" + panel.title + "\".\n" +
                    "Datasource \"" + target.dsType + "\" is not supported.";
          console.log(err);
          errors.push(err);
          return true;
        }
        var timeFilter = "time >= " + timeRange.from.format("x") + "ms AND time <= " + timeRange.to.format("x") + "ms";
        // when using datasource 'default', panel.datasource === null.
        // i copied this from datasource_sv.js because datasourceSrv.get returns a Promise.
        if (panel.datasource === null) {
          var datasource = config.defaultDatasource;
        } else {
          var datasource = panel.datasource;
        }
        var query = {
          measurement: target.measurement,
          query: "SELECT \"value\" FROM \"" + target.measurement + "\" WHERE " + timeFilter,
          datasource: datasource,
          org: orgId,
        };
        console.log(query);
        queries.push(query);
      });
    });
    if (errors.length > 0) {
      alert(errors.join("\n\n"));
      return;
    }
    console.log("post");
    this.backendSrv.post("/api/exportcsv", queries).then(function(success) {
      var blob = new Blob([success], { type: "text/csv;charset=utf-8" });
      window.saveAs(blob, filename);
    });
  }
}

export function exportCsvDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/exportcsv/exportcsv.html',
    controller: ExportCsvCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: "="
    }
  };
}

angular.module('grafana.directives').directive('gfExportCsv', exportCsvDirective);
