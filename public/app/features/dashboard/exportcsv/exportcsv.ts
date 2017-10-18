///<reference path="../../../headers/common.d.ts" />

import angular from 'angular';
import config from 'app/core/config';
import InfluxQuery from 'app/plugins/datasource/influxdb/influx_query';
import * as fileExport from 'app/core/utils/file_export';

export class ExportCsvCtrl {

  dashboard: any;
  panel: any;
  loading: any;

  /** @ngInject */
  constructor(private $q, private templateSrv, private timeSrv, private datasourceSrv, private contextSrv, private backendSrv) {
    this.loading = false;
  }

  export() {
    console.log("export as csv");
    if (this.loading) {
      return;
    }
    this.loading = true;
    var timeRange = this.timeSrv.timeRange(true);
    var filename = this.dashboard.meta.slug + "_" +
                   timeRange.from.toISOString() + "-" +
                   timeRange.to.toISOString() + '.csv';
    var orgId = this.contextSrv.user.orgId;
    var queries = [];

    this.dashboard.forEachPanel(panel => {
      if (!panel.targets) {
        return;
      }
      panel.targets.forEach(target => {
        if (target.dsType !== "influxdb") {
          return;
        }
        var dsName = target.datasource || panel.datasource || config.defaultDatasource;
        queries.push(this.datasourceSrv.get(dsName).then(datasource => {
          var scopedVars = {
            __interval: {value: panel.interval || datasource.interval || "1s"},
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
          return {
            database: datasource.database,
            measurement: target.measurement,
            query: query,
            datasource: datasource.name,
            org: orgId,
          };
        }));
      });
    });

    this.$q.all(queries)
    .then(queries => this.backendSrv.post("/api/exportcsv", queries))
    .then(data => {
      this.loading = false;
      fileExport.saveSaveBlob(data, filename);
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
