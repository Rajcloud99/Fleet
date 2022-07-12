var app =   angular.module('BillApp', []);
var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);
app.controller('BillController',['$scope', function($scope) {
    $scope.isMarketVehicle = false;
    $scope.showRate = false;
    $scope.colSpanValue = 12;
    $scope.payment_basisValue = "";
    var selectInVoice = angular.copy(data);
    $scope.client_gstin = selectInVoice.client_gstin_no?selectInVoice.client_gstin_no:"NA";
    $scope.biller_gstin = selectInVoice.biller_gstin;
    function fixedToTwoDecimal(value){
       return parseFloat((Math.round((value) * 100) / 100).toFixed(2))
    }

    $scope.total = {
        freight: 0,//freight
        loading_charge: 0,//unloading
        unloading_charge: 0,//unloading
        dtn_amt: 0,//detaintion
        other_charge: 0,//gr charges + fuel + other
        weightman_charges:0,//weightman_charges
        overweight_charges:0,//overweight
        extra_running:0,//othr_exp
        //other_expances:0,
        total_expense: 0,
    };
    if(selectInVoice.booking_info && selectInVoice.booking_info.length>0){
        for (var i = 0; i < selectInVoice.booking_info.length; i++) {
            if(selectInVoice.booking_info[i].isMarketVehicle){
                $scope.isMarketVehicle = selectInVoice.booking_info[i].isMarketVehicle;
            }
            if((selectInVoice.booking_info[i].payment_basis=="PMT") || (selectInVoice.booking_info[i].payment_basis=="PUnit")){
                $scope.showRate = true;
                $scope.colSpanValue = 13;
                $scope.payment_basisValue = selectInVoice.booking_info[i].payment_basis;
            }
            $scope.total.freight = fixedToTwoDecimal($scope.total.freight + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].freight) ? selectInVoice.booking_info[i].freight : 0));
            $scope.total.dtn_amt = fixedToTwoDecimal($scope.total.dtn_amt + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].dtn_amt) ? selectInVoice.booking_info[i].dtn_amt : 0));
            $scope.total.other_charge = fixedToTwoDecimal($scope.total.other_charge + ((selectInVoice.booking_info[i].other_charges || 0) + (selectInVoice.booking_info[i].fuel_price_hike || 0) + (selectInVoice.booking_info[i].gr_charges || 0)));
            $scope.total.loading_charge = fixedToTwoDecimal($scope.total.loading_charge + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].loading_charges) ? selectInVoice.booking_info[i].loading_charges : 0));
            $scope.total.unloading_charge = fixedToTwoDecimal($scope.total.unloading_charge + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].unloading_charges) ? selectInVoice.booking_info[i].unloading_charges : 0));
            $scope.total.weightman_charges = fixedToTwoDecimal($scope.total.weightman_charges + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].weightman_charges) ? selectInVoice.booking_info[i].weightman_charges : 0));
            $scope.total.overweight_charges = fixedToTwoDecimal($scope.total.overweight_charges + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].ovr_wt_chrgs) ? selectInVoice.booking_info[i].ovr_wt_chrgs : 0));
            $scope.total.extra_running = fixedToTwoDecimal($scope.total.extra_running + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].othr_exp) ? selectInVoice.booking_info[i].othr_exp : 0));
            $scope.total.total_expense = fixedToTwoDecimal($scope.total.total_expense + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].total) ? selectInVoice.booking_info[i].total : 0));
        }
    }

    $scope.cgst = {freight: 0,loading_charge: 0,unloading_charge: 0,dtn_amt: 0,other_charge: 0,weightman_charges:0,overweight_charges:0,extra_running:0,total_expense: 0};
    $scope.sgst = {freight: 0,loading_charge: 0,unloading_charge: 0,dtn_amt: 0,other_charge: 0,weightman_charges:0,overweight_charges:0,extra_running:0,total_expense: 0};
    $scope.igst = {freight: 0,loading_charge: 0,unloading_charge: 0,dtn_amt: 0,other_charge: 0,weightman_charges:0,overweight_charges:0,extra_running:0,total_expense: 0};
    var total = angular.copy($scope.total);
    $scope.totalWithGST = total;
    if($scope.isMarketVehicle===false){
        if(selectInVoice.apply_gst){
            var clientStateCode = $scope.client_gstin.slice(0,2);
            var billerStateCode = $scope.biller_gstin.slice(0,2);
            if(clientStateCode==billerStateCode){
                //result = ((10 / 100) * 1000)+1000; 10% of 1000
                //apply cgst and sgst;
                $scope.cgst = {
                    freight: fixedToTwoDecimal((2.5 / 100) * total.freight),
                    loading_charge: fixedToTwoDecimal((2.5 / 100) * total.loading_charge),
                    unloading_charge: fixedToTwoDecimal((2.5 / 100) * total.unloading_charge),
                    dtn_amt: fixedToTwoDecimal((2.5 / 100) * total.dtn_amt),
                    other_charge: fixedToTwoDecimal((2.5 / 100) * total.other_charge),
                    weightman_charges: fixedToTwoDecimal((2.5 / 100) * total.weightman_charges),
                    overweight_charges: fixedToTwoDecimal((2.5 / 100) * total.overweight_charges),
                    extra_running: fixedToTwoDecimal((2.5 / 100) * total.extra_running),
                    total_expense: fixedToTwoDecimal((2.5 / 100) * total.total_expense),
                }
                $scope.sgst = {
                    freight: fixedToTwoDecimal((2.5 / 100) * total.freight),
                    loading_charge: fixedToTwoDecimal((2.5 / 100) * total.loading_charge),
                    unloading_charge: fixedToTwoDecimal((2.5 / 100) * total.unloading_charge),
                    dtn_amt: fixedToTwoDecimal((2.5 / 100) * total.dtn_amt),
                    other_charge: fixedToTwoDecimal((2.5 / 100) * total.other_charge),
                    weightman_charges: fixedToTwoDecimal((2.5 / 100) * total.weightman_charges),
                    overweight_charges: fixedToTwoDecimal((2.5 / 100) * total.overweight_charges),
                    extra_running: fixedToTwoDecimal((2.5 / 100) * total.extra_running),
                    total_expense: fixedToTwoDecimal((2.5 / 100) * total.total_expense),
                }
                $scope.totalWithGST = {
                    freight: fixedToTwoDecimal((total.freight)+($scope.cgst.freight)+($scope.sgst.freight)),
                    loading_charge: fixedToTwoDecimal((total.loading_charge)+($scope.cgst.loading_charge)+($scope.sgst.loading_charge)),
                    unloading_charge: fixedToTwoDecimal((total.unloading_charge)+($scope.cgst.unloading_charge)+($scope.sgst.unloading_charge)),
                    dtn_amt: fixedToTwoDecimal((total.dtn_amt)+($scope.cgst.dtn_amt)+($scope.sgst.dtn_amt)),
                    other_charge: fixedToTwoDecimal((total.other_charge)+($scope.cgst.other_charge)+($scope.sgst.other_charge)),
                    weightman_charges: fixedToTwoDecimal((total.weightman_charges)+($scope.cgst.weightman_charges)+($scope.sgst.weightman_charges)),
                    overweight_charges: fixedToTwoDecimal((total.overweight_charges)+($scope.cgst.overweight_charges)+($scope.sgst.overweight_charges)),
                    extra_running: fixedToTwoDecimal((total.extra_running)+($scope.cgst.extra_running)+($scope.sgst.extra_running)),
                    total_expense: fixedToTwoDecimal((total.total_expense)+($scope.cgst.total_expense)+($scope.sgst.total_expense)),
                };
            }else{
                //apply IGST
                $scope.igst = {
                    freight: fixedToTwoDecimal((5 / 100) * total.freight),
                    loading_charge: fixedToTwoDecimal((5 / 100) * total.loading_charge),
                    unloading_charge: fixedToTwoDecimal((5 / 100) * total.unloading_charge),
                    dtn_amt: fixedToTwoDecimal((5 / 100) * total.dtn_amt),
                    other_charge: fixedToTwoDecimal((5 / 100) * total.other_charge),
                    weightman_charges: fixedToTwoDecimal((5 / 100) * total.weightman_charges),
                    overweight_charges: fixedToTwoDecimal((5 / 100) * total.overweight_charges),
                    extra_running: fixedToTwoDecimal((5 / 100) * total.extra_running),
                    total_expense: fixedToTwoDecimal((5 / 100) * total.total_expense),
                };

                $scope.totalWithGST = {
                    freight: fixedToTwoDecimal((total.freight)+($scope.igst.freight)),
                    loading_charge: fixedToTwoDecimal((total.loading_charge)+($scope.igst.loading_charge)),
                    unloading_charge: fixedToTwoDecimal((total.unloading_charge)+($scope.igst.unloading_charge)),
                    dtn_amt: fixedToTwoDecimal((total.dtn_amt)+($scope.igst.dtn_amt)),
                    other_charge: fixedToTwoDecimal((total.other_charge)+($scope.igst.other_charge)),
                    weightman_charges: fixedToTwoDecimal((total.weightman_charges)+($scope.igst.weightman_charges)),
                    overweight_charges: fixedToTwoDecimal((total.overweight_charges)+($scope.igst.overweight_charges)),
                    extra_running: fixedToTwoDecimal((total.extra_running)+($scope.igst.extra_running)),
                    total_expense: fixedToTwoDecimal((total.total_expense)+($scope.igst.total_expense)),
                };
            }
        }
    }
    $scope.selectInVoice = selectInVoice;
}]);
