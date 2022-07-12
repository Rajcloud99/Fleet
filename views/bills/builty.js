var app = angular.module("builty", []);

var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);

var builty_materials_headers = ['sl_no', 'container_no', 'boe_no', 'value', 'material_name', 'weight', 'rate', 'freight'];
var builty_trips_headers = ['vehicle_no', 'gr_no', 'trip_no', 'tin'];

app.controller("builtyCtrl", function($scope) {
    for (var key in data) {
        $scope[key] = data[key];
    }
    var t1 = document.getElementById("t1");
    for (var i = 0; i < data.materials.length; i++) {
        var row = t1.insertRow(i + 1);
        for (var j = 0; j < builty_materials_headers.length; j++) {
            row.insertCell(j);
            var value;
            if((($scope.clientId=="100002")||($scope.clientId=="100003")) && (builty_materials_headers[j]=="rate")){
                value = "Fixed";
            }else if((($scope.clientId=="100002")||($scope.clientId=="100003")) && (builty_materials_headers[j]=="value")){
                value = "As per BOE attached";
            }else if((($scope.clientId=="100002")||($scope.clientId=="100003")) && (builty_materials_headers[j]=="weight")){
                value = "As per BOE attached";
            }else if((($scope.clientId=="100002")||($scope.clientId=="100003")) && (builty_materials_headers[j]=="freight")){
                value = 0;
            }else{
                value = data.materials[i][builty_materials_headers[j]];
            }
            row.cells[j].innerHTML = value !== undefined ? value : '';
            row.cells[j].className += 'data ctd calign';
        }
    }

    var t2 = document.getElementById("t2");
    for (var i = 0; i < data.trips.length; i++) {
        var row = t2.insertRow(i + 1);
        for (var j = 0; j < builty_trips_headers.length; j++) {
            row.insertCell(j);
            var value = data.trips[i][builty_trips_headers[j]];
            row.cells[j].innerHTML = value !== undefined ? value : '';
            row.cells[j].className += 'data ctd calign';
        }
    }
});
