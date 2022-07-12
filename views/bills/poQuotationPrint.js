var app = angular.module("poQuotation", []);

var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);

var spare_headers = ['name', 'code', 'remaining_quantity'];
app.controller("poQuotationCtrl", function($scope) {
    for (var key in data) {
        $scope[key] = data[key];
    }
    var table = document.getElementById("poQuote");

    for (var i = 0; i < data.spare.length; i++) {
        var row = table.insertRow(i + 1);
        for (var j = 0; j < spare_headers.length; j++) {
            row.insertCell(j);
            var value = data.spare[i][spare_headers[j]];
            row.cells[j].innerHTML = value !== undefined ? value : '';
            row.cells[j].className += 'data ctd myTableWordWrap';
        }
    }

});
