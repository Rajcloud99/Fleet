var app = angular.module("dieselSlip", []);

var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
	pair = pair.split('=');
	result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);

app.controller("dieselSlipCtrl", function($scope) {
	for (var key in data) {
		$scope[key] = data[key];
	}

});
