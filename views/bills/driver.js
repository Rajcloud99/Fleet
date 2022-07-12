var app = angular.module("driver", []);

var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);

var materials_headers = ['nature', 'reference', 'place', 'quantity', 'rate_per_litre', 'amount'];

app.controller("driverCtrl", function($scope) {
    for (var key in data) {
        $scope[key] = data[key];
    }

    // $scope[content_editable] = "true";

    var table = document.getElementById("materials");

    for (var i = 0; i < data.materials.length; i++) {
        var row = table.insertRow(i + 1);
        for (var j = 0; j < materials_headers.length; j++) {
            row.insertCell(j);
            var value = data.materials[i][materials_headers[j]];
            row.cells[j].innerHTML = value ? value : '';
            row.cells[j].className += 'data ctd';
        }
    }
});
