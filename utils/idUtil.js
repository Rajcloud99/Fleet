/**
 * Created by manish on 29/12/16.
 */
let utils = {};
let baseVendorMaintenanceCount = 10001;
let basePartCode = 1;
let baseGpsPOCode = 1;
let basePRCode = 1;
let baseBranchId = 101;
let baseAccountId = 1001;
let baseVoucherId = 1001;
let basePlainVoucherId = 1001;
let baseBillNo=17180001701;
let baseDepBranch=1;
let baseCustomerCount = 101;

let Branch = promise.promisifyAll(commonUtil.getModel('branch'));
let Customer = promise.promisifyAll(commonUtil.getModel('customer'));
let DepartmentBranch = promise.promisifyAll(commonUtil.getModel('departmentBranch'));
let TaskMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('taskMaster'));
let VendorMaintenance = promise.promisifyAll(commonUtil.getMaintenanceModel('vendorMaintenance_'));
let Parts = promise.promisifyAll(commonUtil.getMaintenanceModel('parts'));
let Po = promise.promisifyAll(commonUtil.getMaintenanceModel('po'));
let Pr = promise.promisifyAll(commonUtil.getMaintenanceModel('pr'));
let Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));
let Task = promise.promisifyAll(commonUtil.getMaintenanceModel('task'));
let JobCard = promise.promisifyAll(commonUtil.getMaintenanceModel('jobCard'));
let SpareIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('spareIssue'));
let TyreIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreIssue'));
let TyreRetread = promise.promisifyAll(commonUtil.getMaintenanceModel('TyreRetread'));
let Invoice = promise.promisifyAll(commonUtil.getModel('invoice'));
let ToolIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('toolIssue'));
let Tool = promise.promisifyAll(commonUtil.getMaintenanceModel('tool'));
let OE = promise.promisifyAll(commonUtil.getMaintenanceModel('otherExpenses'));
let Diesel=promise.promisifyAll(commonUtil.getMaintenanceModel('diesel'));
let Trip = promise.promisifyAll(commonUtil.getModel('trip'));
let Quotation = promise.promisifyAll(commonUtil.getMRPModel('quotation'));
let SO = promise.promisifyAll(commonUtil.getMRPModel('so'));
let Invoice_so = promise.promisifyAll(commonUtil.getMRPModel('invoice'));
let Accounts = promise.promisifyAll(commonUtil.getModel('accounts'));
let Voucher = promise.promisifyAll(commonUtil.getModel('accountsVoucher'));
let PlainVoucher = promise.promisifyAll(commonUtil.getModel('plainVoucher'));


utils.generateBranchId  = function(filterObj,next) {
    filterObj.id={$exists:true};
    let cursor = Branch.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastId= parseInt(documentArr[0].id);
            return next(null,(lastId+1));
        }else{
            return next(null,baseBranchId);
        }
    });
};

utils.generateAccountId  = function(next) {
	let filterObj = {accountId:{$exists:true}};
	let cursor = Accounts.find(filterObj).sort({$natural:-1}).limit(1);
	cursor.exec(function(err,documentArr) {
		if (err){return next(err);}
		if (documentArr && documentArr.length>0){
			let lastId= parseInt(documentArr[0].accountId);
			return next(null,(lastId+1));
		}else{
			return next(null,baseAccountId);
		}
	});
};
utils.generatePlainVoucherId  = function(clientId,next) {
	let filterObj = {clientId: clientId, PlainVoucherId:{$exists:true}};
	let cursor = PlainVoucher.find(filterObj).sort({PlainVoucherId:-1}).limit(1);
	cursor.exec(function(err,documentArr) {
		if (err){return next(err);}
		if (documentArr && documentArr.length>0){
			let lastId= parseInt(documentArr[0].PlainVoucherId);
			return next(null,(lastId+1));
		}else{
			return next(null,basePlainVoucherId);
		}
	});
};
utils.generatePVId  = function(clientId,type,next) {
	let filterObj = {clientId: clientId, pvId:{$exists:true},type:type};
	let cursor = PlainVoucher.find(filterObj).sort({PlainVoucherId:-1}).limit(1);
	cursor.exec(function(err,documentArr) {
		if (err){return next(err);}
		if (documentArr && documentArr.length>0){
			let lastId= parseInt(documentArr[0].pvId.substring(2));
			return next(null,constant.voucherTypeMapper[type]+(lastId+1));
		}else{
			return next(null,constant.voucherTypeMapper[type]+basePlainVoucherId);
		}
	});
};

utils.generateVoucherId  = function(clientId,next) {
	let filterObj = {clientId: clientId, voucherId:{$exists:true}};
	let cursor = Voucher.find(filterObj).sort({voucherId:-1}).limit(1);
	cursor.exec(function(err,documentArr) {
		if (err){return next(err);}
		if (documentArr && documentArr.length>0){
			let lastId= parseInt(documentArr[0].voucherId);
			return next(null,(lastId+1));
		}else{
			return next(null,baseVoucherId);
		}
	});
};

utils.generateVId  = function(clientId,type,next) {
  let filterObj = {clientId: clientId, vId:{$exists:true},type:type};
  let cursor = Voucher.find(filterObj).sort({voucherId:-1}).limit(1);
  cursor.exec(function(err,documentArr) {
    if (err){return next(err);}
    if (documentArr && documentArr.length>0){
      let lastId= parseInt(documentArr[0].vId.substring(2));
      return next(null,constant.voucherTypeMapper[type]+(lastId+1));
    }else{
      return next(null,constant.voucherTypeMapper[type]+baseVoucherId);
    }
  });
};

utils.generateDepartmentBranchId  = function(branchId,departmentCode,next) {
    return next(null,departmentCode+branchId);
};

utils.generateCustomerId  = function(filterObj,next) {
	let oCust = {
		customerId : "CUST"+baseCustomerCount,
		sap_id : "M3000",
		sap_no: 1,
		cno:baseCustomerCount
	};
    let cursor = Customer.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
			documentArr[0].customerId = documentArr[0].customerId || 'CUST101';
            let lastCustNumId= parseInt(documentArr[0].customerId.substr(4));
            oCust.customerId =  "CUST"+(lastCustNumId+1);
            oCust.cno = lastCustNumId+1;
           if(filterObj.clientId === '100003'){
			   let sapCust = Customer.find(filterObj).sort({sap_no:-1}).limit(1);
			   sapCust.exec(function(err,oScust) {
				   if (err){return next(err);}
				   if (oScust && oScust.length>0){
					   oCust.sap_id = "M"+(oScust[0].sap_no +1);
					   oCust.sap_no = oScust[0].sap_no +1;
				   }
				   return next(null,oCust);
			   });
		   }else{
			   return next(null,oCust);
		   }
        }else{
			return next(null,oCust);
		}
    });
};
utils.generateCustomerSAPId  = function(filterObj,next) {
    let cursor = Customer.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastSAPCustNumId= documentArr[0].sap_id || "M5000";//if not exist for last
            let noId = lastSAPCustNumId.split('M');
            lastSAPCustNumId = lastSAPCustNumId && lastSAPCustNumId[1] ? lastSAPCustNumId[1] : 3000;
            return next(null,"M"+(parseInt(lastSAPCustNumId)+1));
        }else{
            return next(null,"M3000");//start od=f series
        }
    });
};


utils.generateNewTaskMasterId  = function(countFilterObj,next) {
    TaskMaster.countAsync(countFilterObj)
            .then(function(count) {
                return next(null, count);
            })
            .catch(function(err) {
                return next(err,null);
            });
};

utils.generateMaintenanceExpense  = function(countFilterObj,next) {
    OE.countAsync(countFilterObj)
        .then(function(count) {
            return next(null, ("EXP"+(++count)));
        })
        .catch(function(err) {
            return next(err,null);
        });
};

utils.generateNewVendorId  = function(filterObj,next) {
    let cursor = VendorMaintenance.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            return next(null,parseInt(documentArr[0].vendorId)+1);
        }else{
            return next(null,baseVendorMaintenanceCount);
        }
    });
};

utils.generatePartCode  = function(filterObj,next) {
    let cursor = Parts.find(filterObj).sort({sn:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= documentArr[0].sn;
            return next(null,lastCode+1);
        }else{
            return next(null,basePartCode);
        }
    });
};

utils.generatePRCode  = function(filterObj,next) {
    let cursor = Pr.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].prnumber.substr(2));
            return next(null,"PR"+(lastCode+1));
        }else{
            return next(null,"PR"+basePRCode);
        }
    });
};
utils.generateTripNo  = function(filterObj,next) {
    let cursor = Trip.findWithDeleted(filterObj).sort({trip_no:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            return next(null,documentArr[0].trip_no);
        }else{
        	return next(null,1);
        }
    });
};


utils.generateDieselSlip  = function(filterObj,next) {
    let cursor = Diesel.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].slip_number.substr(3));
            return next(null,"DSL"+(lastCode+1));
        }else{
            return next(null,"DSL"+basePRCode);
        }
    });
};
utils.generateSlipNumber  = function(filterObj,next) {
    let cursor = SpareIssue.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].slip_number.substr(4));
            return next(null,"SLIP"+(lastCode+1));
        }else{
            return next(null,"SLIP"+basePartCode);
        }
    });
};

utils.generateTyreSlipNumber  = function(filterObj,next) {
    let cursor = TyreIssue.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode=0,rNO=0,iNo=0;
            if(documentArr[0].return_slip_number)
                rNo=parseInt(documentArr[0].return_slip_number.substr(8));
            if(documentArr[0].issue_slip_number)
                iNo=parseInt(documentArr[0].issue_slip_number.substr(8));
            lastCode= rNO>iNo?rNO:iNo;
            return next(null,"TyreSLIP"+(lastCode+1));
        }else{
            return next(null,"TyreSLIP"+basePartCode);
        }
    });
};

utils.generateTyreRetreadSlipNumber  = function(filterObj,next) {
    let cursor = TyreRetread.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].issue_slip_no.substr(6));
            return next(null,"TRSLIP"+(lastCode+1));
        }else{
            return next(null,"TRSLIP"+basePartCode);
        }
    });
};

utils.generateToolSlipNumber  = function(filterObj,next) {
    let cursor = ToolIssue.find(filterObj).sort({last_modified_at:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode=0,rNO=0,iNo=0;
            if(documentArr[0].return_slip_number)
                rNo=parseInt(documentArr[0].return_slip_number.substr(8));
            if(documentArr[0].issue_slip_number)
                iNo=parseInt(documentArr[0].issue_slip_number.substr(8));
            lastCode= rNO>iNo?rNO:iNo;
            return next(null,"ToolSLIP"+(lastCode+1));
        }else{
            return next(null,"ToolSLIP"+basePartCode);
        }
    });
};

utils.generatePOCode  = function(filterObj,next) {
    let cursor = Po.find(filterObj).sort({"created_at":-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        let response={};
        if (documentArr && documentArr.length>0){
            let doc=JSON.parse(JSON.stringify(documentArr[0]));
            if(doc.spare && doc.spare.length===0){
             doc.newCode=null;
              return next(null,doc);
            }
            response.newCode = "PO"+(parseInt(documentArr[0].ponumder.substr(2))+1);
            return next(null,response);
        }else{
            response.newCode = "PO"+basePartCode;
            return next(null,response);
        }
    });
};

utils.generateQuotationID  = function(filterObj,callback) {
	let cursor = Quotation.find(filterObj).sort({$natural:-1}).limit(1);
	cursor.exec(function(err,documentArr) {
		if (err){return callback(err);}
		if (documentArr && documentArr.length>0){
			let lastCode = parseInt(documentArr[0].quot_number.substr(4));
			return callback(null,"QUOT"+(lastCode+1));
		}else{
			return callback(null,"QUOT"+baseGpsPOCode);
		}
	});
};

utils.generateSOID  = function(filterObj,callback) {
	let cursor = SO.find(filterObj).sort({$natural:-1}).limit(1);
	cursor.exec(function(err,documentArr) {
		if (err){return callback(err);}
		if (documentArr && documentArr.length>0){
			let lastCode = parseInt(documentArr[0].so_number.substr(2));
			return callback(null,"SO"+(lastCode+1));
		}else{
			return callback(null,"SO"+baseGpsPOCode);
		}
	});
};

utils.generateInvoiceID  = function(filterObj,callback) {
	let cursor = Invoice_so.find(filterObj).sort({$natural:-1}).limit(1);
	cursor.exec(function(err,documentArr) {
		if (err){return callback(err);}
		if (documentArr && documentArr.length>0){
			let lastCode = parseInt(documentArr[0].invoice_no);
			return callback(null,(lastCode+1));
		}else{
			return callback(null,baseGpsPOCode);
		}
	});
};


utils.generatePartCategoryWiseCode  = function(filterObj,categoryCode,next) {
    let cursor = Parts.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].category_wise_code.substr(categoryCode.length));
            return next(null,categoryCode+(lastCode+1));
        }else{
            return next(null,categoryCode+basePartCode);
        }
    });
};

utils.generateInventoryEntryId  = function(filterObj,next) {
    let cursor = Inventory.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].entryId.substr(3));
            return next(null,"INV"+(lastCode+1));
        }else{
            return next(null,"INV"+basePartCode);
        }
    });
};

utils.generateToolId  = function(filterObj,next) {
    let cursor = Tool.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].toolId.substr(4));
            return next(null,(lastCode+1));
        }else{
            return next(null,1);
        }
    });
};

utils.generateJobCardId  = function(filterObj,next) {
    let cursor = JobCard.find(filterObj).sort({"created_at":-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].jobId.substr(3));
            return next(null,"JOB"+(lastCode+1));
        }else{
            return next(null,"JOB"+basePartCode);
        }
    });
};

utils.generateTaskId  = function(filterObj,next) {
    let cursor = Task.find(filterObj).sort({$natural:-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].taskId.substr(4));
            return next(null,"TASK"+(lastCode+1));
        }else{
            return next(null,"TASK"+basePartCode);
        }
    });
};

utils.generateBillNo  = function(filterObj,next) {
    let cursor = Invoice.find(filterObj).sort({"billed_date":-1}).limit(1);
    cursor.exec(function(err,documentArr) {
        if (err){return next(err);}
        if (documentArr && documentArr.length>0){
            let lastCode= parseInt(documentArr[0].bill_no);
            return next(null,(lastCode+1));
        }else{
            return next(null,baseBillNo);
        }
    });
};

module.exports = utils;
