var app =   angular.module('JobApp', []);
var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);
app.controller('ServiceController',['$scope', function($scope) {
  $scope.prLocalData = data;//{"last_modified_at":"2017-05-25T07:29:44.516Z","created_at":"2017-05-25T07:29:44.516Z","priority":"High","clientId":"10003","created_by_name":"PRATIK","created_by_employee_code":"pratik","last_modified_by_name":"PRATIK","last_modified_employee_code":"pratik","created_by":"583e876e8ffbda8472ce9b23","branchName":"ICD Loni","branchId":"loni","prnumber":"PR15","__v":0,"status":"New","spare":[{"name":"Tool 123","code":"SP1","quantity":9,"uom":"Piece","needed_date":"2017-05-24T18:30:00.000Z","remaining_quantity":9,"previousRate":1233,"_id":"592687e847c3c13c073ee060","type":"Spare","po_no":[],"$$hashKey":"object:454"}],"approver":{"_id":"58fdac772a23c2181d6d1a62","name":"Devi Prasad"},"$$hashKey":"object:318"}
}]);
  