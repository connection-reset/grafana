///<reference path="../../../headers/common.d.ts" />

import angular from 'angular';
import config from 'app/core/config';
import InfluxQuery from 'app/plugins/datasource/influxdb/influx_query';
import * as fileExport from 'app/core/utils/file_export';

export class ExportCsvCtrl {

  dashboard: any;
  panel: any;

  /** @ngInject */
  constructor(private $q, private templateSrv, private timeSrv, private datasourceSrv, private contextSrv, private backendSrv) {
  }

  export() {
    console.log("export as csv");
    var timeRange = this.timeSrv.timeRange(true);
    var filename = this.dashboard.meta.slug + "_" +
                   timeRange.from.toISOString() + "-" +
                   timeRange.to.toISOString() + '.csv';
    var orgId = this.contextSrv.user.orgId;
    var queries = [];

    this.dashboard.forEachPanel(panel => {
      panel.targets.forEach(target => {
        if (target.dsType !== "influxdb") {
          console.log(target);
          return true;
        }
        var dsName = target.datasource || panel.datasource || config.defaultDatasource;
        queries.push(this.datasourceSrv.get(dsName).then(datasource => {
          var scopedVars = {
            __interval: {value: datasource.interval || "1s"},
            interval: undefined,
            timeFilter: undefined,
          };
          scopedVars.interval = scopedVars.__interval;
          var options = {
            rangeRaw: timeRange.raw,
            scopedVars: scopedVars,
          };
          var query = new InfluxQuery(target, this.templateSrv, scopedVars).render(true);
          var timeFilter = datasource.getTimeFilter(options);
          scopedVars.timeFilter = {value: timeFilter};
          query = this.templateSrv.replace(query, scopedVars);
          console.log(query);
          return {
            database: datasource.database,
            measurement: target.measurement,
            query: query,
            datasource: datasource.name,
            org: orgId,
          };
        }));
        return true; //shut at-loader up
      });
    });

    this.$q.all(queries)
    .then(queries => {
      console.log(queries);
      return queries;
    })
    .then(queries => this.backendSrv.post("/api/exportcsv", queries))
    .then(data => {
      fileExport.saveSaveBlob(data, filename);
    });

    /*
    // get data sources and measurements from panels
    console.log("post");
    this.backendSrv.post("/api/exportcsv", queries).then(function(success) {
      var blob = new Blob([success], { type: "text/csv;charset=utf-8" });
      window.saveAs(blob, filename);
    });
    */
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
