var app =   angular.module('app', []);
var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);
app.controller('MyController',['$scope', function($scope) {
    $scope.retData = data;
}]);