var app = angular.module("diesel", []);

var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);

app.controller("dieselCtrl", function($scope) {
    for (var key in data) {
        $scope[key] = data[key];
    }

});
