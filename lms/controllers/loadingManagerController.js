var router = express.Router();
var Trip = commonUtil.getModel('trip');
var GR = commonUtil.getModel('tripGr');
var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));

router.put('/start_trip', async (req, res, next) => {
  console.log(req.body);

  var gr = req.body.trip.gr;

  let oTrip = await Trip.findOne({_id: req.body.trip._id});
  let oUpdatedBy = {
    user_id: req.user._id,
    date: (req.body.updated_status && req.body.updated_status.date) || new Date(),
    systemDate: new Date(),
    status: req.body.trip.status,
    remark: (req.body.updated_status && req.body.updated_status.remark) || null
  };
  if (oTrip && (!oTrip.isCancelled)) {
    oTrip.statuses.push(oUpdatedBy);
    delete req.body.trip._id;
    delete req.body.trip.gr;
    await oTrip.set(req.body.trip).save();
  }

  var vid = req.body.vehicle._id;
  delete req.body.vehicle._id;
  var regveh = await RegisteredVehicle.findByIdAndUpdate(vid, {$set: req.body.vehicle},{new: true});

  try {
    let oGR = await GR.findOne({_id: gr[0]._id});
    if(!oGR) return res.status(404).json({message: 'GR doesn\'t exists'});
    if(oGR.tripCancelled) {
      return res.status(405).json({message: 'Trip is cancelled'});
    }
    let oUpdatedBy = {
      user_id: req.user._id,
      date: (req.body.updated_status && req.body.updated_status.date) || new Date(),
      systemDate: new Date(),
      status: null,
      remark: (req.body.updated_status && req.body.updated_status.remark) || null
    };
    if(oGR && (oGR.tripCancelled === false)) {
      oGR.statuses.push(oUpdatedBy);
      delete gr[0]._id;
      await oGR.set(gr[0]).save();
    }
  } catch(err) {
    next(err);
  }

  return res.status(200).json({message: 'Success'});
});

module.exports = router;
