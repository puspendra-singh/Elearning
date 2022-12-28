const async = require("async");
function Testimonial() {
  /** Function to get list **/
  this.list = (req, res, next) => {
    if (isPost(req)) {
      let limit = req.body.length ? parseInt(req.body.length) : DEFAULT_LIMIT;
      let skip  = req.body.start  ? parseInt(req.body.start)  : DEFAULT_SKIP;
      let draw  = req.body.draw   ? parseInt(req.body.draw)   : DEFAULT_SKIP;
      let statusSearch = req.body.statusSearch ? req.body.statusSearch : '';

      let commonCondition = { is_deleted: NOT_DELETED };
      configDatatable(req,res,null).then(dataTableConfig=>{
        dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonCondition);
        if (statusSearch) {
          dataTableConfig.conditions['is_active'] = Number(statusSearch);
        }
        const collection = db.collection("testimonials");
        async.parallel(
          {
            list: (callback) => {
              collection.find(dataTableConfig.conditions, {}).skip(skip).limit(limit).sort(dataTableConfig.sort_conditions).toArray((err, result) => {
                if (result.length > 0) {
                  let options = {
                    path: TESTIMONIAL_FILE_URL,
                    result: result,
                  };
                  appendFileExistData(options).then((response) => {
                    let result = response.result ? response.result : [];
                    callback(err, result);
                  });
                } else {
                  callback(err, result);
                }
              });
            },
            recordsTotol: (callback) => {
              collection.countDocuments(commonCondition, {}, (err, result) => {
                callback(err, result);
              });
            },
            recordsfiltered: (callback) => {
              collection.countDocuments(dataTableConfig.conditions,{},(err, result) => {
                  callback(err, result);
                }
              );
            },
          },
          (err, response) => {
            /** Send error message */

            if (err) return next(err);
            res.send({
              status          : STATUS_SUCCESS,
              draw            : draw,
              data            : response.list ? response.list : [],
              recordsTotal    : response.recordsTotol ? response.recordsTotol : 0,
              recordsFiltered : response.recordsfiltered ? response.recordsfiltered : 0,
            });
          }
        );
      });
    } else {
      req.breadcrumbs(BREADCRUMBS["admin/testimonials"]);
      res.render("list", {
        breadcrumbs: req.breadcrumbs(),
      });
    }
  }; //End List

  /** Function is used to add cms */
  this.add = async(req, res, next) => {
    if (isPost(req)) {
      req.body = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
      req.checkBody({
        name: {
          notEmpty: true,
          errorMessage: res.__("admin.testimonials.please_enter_name"),
          isLength :{
            options    : {min : NAME_MIN_LENGTH, max : NAME_MAX_LENGTH},
            errorMessage:res.__("system.name_limit.this_value_should_contain_minimum_and_maximum_character",NAME_MIN_LENGTH,NAME_MAX_LENGTH)
          }
        },
        rating: {
          notEmpty: true,
          errorMessage: res.__("admin.testimonials.please_enter_rating"),
          isInt : {
            options : {min:1, max:5},
            errorMessage: res.__("admin.testimonials.it_should_be_between_1_to_5",1,5),
          },
        },
        message: {
          notEmpty: true,
          errorMessage: res.__("admin.testimonials.please_enter_about"),
          isLength :{
            options    : {min : DESCRIPTION_MIN_LENGTH, max : DESCRIPTION_MAX_LENGTH},
            errorMessage:res.__("system.description_limit.this_value_should_contain_minimum_and_maximum_character", DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH)
          }
        }
      });

      var errors = parseValidation(req.validationErrors());
      if (!errors) {
        let name        = req.body.name         ? req.body.name : "";
        let rating      = req.body.rating       ? req.body.rating : "";
        let message      = req.body.message        ? req.body.message : "";


        let insertData = {
          name        : name,
          rating      : rating,
          message     : message,
          is_active   : ACTIVE,
          is_deleted  : NOT_DELETED,
          created     : getUtcDate(),
          modified    : getUtcDate(),
        }


          let file = req.files ? req.files.profile_image : {};
          if (Object.keys(file).length == 0) {
            return res.send({
              status  : STATUS_ERROR,
              message  : [
                {
                  param: "profile_image",
                  msg: res.__("admin.system.please_select_an_image"),
                },
              ],
            });
          } else {
            let options = {
              image      : file,
              filePath : TESTIMONIAL_FILE_PATH,
            };

            /** Upload file */
            await moveUploadedFile(req, res, options).then((response) => {
              if (response.status == STATUS_ERROR) {
                return res.send({
                  status  : STATUS_ERROR,
                  message  : [{ param: "profile_image", msg: response.message }],
                });
              } else {

                var newFileName = response.fileName     ? response.fileName : "";
                insertData["image"] = newFileName
                const collection = db.collection("testimonials");
                collection.insertOne(insertData,function (err, result) {
                    if (!err) {
                      req.flash(STATUS_SUCCESS, res.__("admin.testimonials.testimonial_has_been_created_successfully"));
                      return res.send({
                        status: STATUS_SUCCESS,
                        message: res.__("admin.testimonials.testimonial_has_been_created_successfully"),
                        redirect_url: WEBSITE_ADMIN_URL+"testimonial",
                      });
                    } else {
                      req.flash(STATUS_ERROR, res.__("admin.system.something_went_wrong"));
                      return res.send({
                        status: STATUS_ERROR,
                        message: '',
                        redirect_url: WEBSITE_ADMIN_URL+"testimonial",
                      });
                    }
                  }
                );
              }
            });
          }
      } else {
        res.send({
          status: STATUS_ERROR,
          message: errors,
          redirect_url: WEBSITE_ADMIN_URL+"testimonial",
        });
      }
    } else {
      req.breadcrumbs(BREADCRUMBS["admin/testimonials/add"]);
      res.render("add");
    }
  }; //End add

  /** Function to edit detail **/
  this.edit = async function (req, res) {
    let testimonialsId = req.params.id ? req.params.id : "";
    if (isPost(req)) {
      req.body = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
      req.checkBody({
        name: {
          notEmpty: true,
          errorMessage: res.__("admin.testimonials.please_enter_name"),
          isLength :{
            options    : {min : NAME_MIN_LENGTH, max : NAME_MAX_LENGTH},
            errorMessage:res.__("system.name_limit.this_value_should_contain_minimum_and_maximum_character",NAME_MIN_LENGTH,NAME_MAX_LENGTH)
          }
        },
        rating: {
          notEmpty: true,
          errorMessage: res.__("admin.testimonials.please_enter_rating"),
          isInt : {
            options : {min:1, max:5},
            errorMessage: res.__("admin.testimonials.it_should_be_between_1_to_5",1,5),
          },
        },
        message: {
          notEmpty: true,
          errorMessage: res.__("admin.testimonials.please_enter_about"),
          isLength :{
            options    : {min : DESCRIPTION_MIN_LENGTH, max : DESCRIPTION_MAX_LENGTH},
            errorMessage:res.__("system.description_limit.this_value_should_contain_minimum_and_maximum_character", DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH)
          }
        }
      });

      var errors = parseValidation(req.validationErrors());
      if (!errors) {
        if (req.files) {
          let file = req.files ? req.files.profile_image : {};
          if (Object.keys(file).length == 0) {
            res.send({
              status: STATUS_ERROR,
              message: [
                {
                  param: "profile_image",
                  msg: res.__("admin.slider.please_select_an_image"),
                },
              ],
            });
          } else {
            let options = {
              image      : file,
              filePath : TESTIMONIAL_FILE_PATH,
            };
            await moveUploadedFile(req, res, options).then((response) => {
              if (response.status == STATUS_ERROR) {
                return res.send({
                  status  : STATUS_ERROR,
                  message  : [{ param: "image", msg: response.message }],
                });
              } else {
                var newFileName = response.fileName ? response.fileName : "";
                updateTestimonials(req, res, newFileName);
              }
            });
          }
        } else {
          let oldImage = req.body.old_image ? req.body.old_image : "";
          updateTestimonials(req, res, oldImage);
        }
      } else {
        res.send({
          status: STATUS_ERROR,
          message: errors,
          redirect_url: "/testimonial",
        });
      }
    } else {
      var collection = db.collection("testimonials");
      collection.findOne({ _id: ObjectId(testimonialsId) }, function(err, result) {
        if(!err) {
          let options = {
            file_url    : TESTIMONIAL_FILE_URL,
            file_path   : TESTIMONIAL_FILE_PATH,
            database_field : "image",
            result      : [result],
          };
          appendFileExistData(options).then((response) => {
            let result = response.result[0] ? response.result[0] : [];
            req.breadcrumbs(BREADCRUMBS["admin/testimonials/edit"]);
            res.render("edit", {
              result  : result ? result : {},
              message : "",
            });
          });

        } else {
          req.flash(STATUS_ERROR, res.__("admin.system.something_went_wrong"));
          res.redirect(WEBSITE_ADMIN_URL + "testimonial");
        }
      });
    }
  }; //End editDetail

  /** Function is used to update testimonials */
  updateTestimonials = (req, res, fileName) =>{
    let testimonialId = req.params.id         ? req.params.id : "";
    let name          = req.body.name         ? req.body.name : "";
    let rating        = req.body.rating       ? req.body.rating : "";
    let message         = req.body.message        ? req.body.message : "";

    /** Update testimonial data **/
    let updateData = {
      name        : name,
      rating      : rating,
      message      : message,
      image       : fileName,
      modified    : new Date(),
    };


    const collection = db.collection("testimonials");
    collection.updateOne({ _id: ObjectId(testimonialId) }, { $set: updateData }, function (error, result) {
      if (!error) {
        req.flash(STATUS_SUCCESS,res.__("admin.testimonials.testimonial_has_been_updated_successfully"));
        res.send({
          status: STATUS_SUCCESS,
          message: "",
          redirect_url: "/admin/testimonial/"
        });
      } else {
        req.flash(STATUS_SUCCESS,res.__("admin.system.something_went_wrong_please_try_again_later"));
        res.send({
          status: STATUS_ERROR,
          message: "",
          redirect_url: "/admin/testimonial/edit/" + testimonialId,
        });
      }
    });
  } // End updateSlider


  /** Function to delete detail **/
  this.deleteDetail   =  (req, res) =>{
    let testimonialId = req.params.id ? req.params.id : "";
    const collection  = db.collection("testimonials");
    collection.updateOne(
      { _id: ObjectId(testimonialId) },
      { $set: { is_deleted: DELETED, modified: new Date() } },
       (err, result)=> {
        if (!err) {
          req.flash(
            STATUS_SUCCESS,
            res.__("admin.testimonials.testimonial_has_been_deleted_successfully")
          );
          res.redirect(WEBSITE_ADMIN_URL + "testimonials");
        } else {
          req.flash(STATUS_ERROR, res.__("admin.system.something_went_wrong"));
          res.redirect(WEBSITE_ADMIN_URL + "testimonials");
        }
      }
    );
  }; //End deleteDetail

  /** Function to update status **/
  this.updateStatus =  (req, res) =>{
    var testimonialId = req.params.id ? req.params.id : "";
    var status = req.params.status == ACTIVE ? INACTIVE : ACTIVE;
    const collection = db.collection("testimonials");
    collection.updateOne(
      { _id: ObjectId(testimonialId) },
      {
        $set: {
          is_active: status,
          modified: new Date(),
        },
      },
       (err, result)=> {
        if (!err) {
          req.flash(
            STATUS_SUCCESS,
            res.__("admin.testimonials.status_has_been_updated_successfully")
          );
          res.redirect(WEBSITE_ADMIN_URL + "testimonials");
        } else {
          req.flash(STATUS_ERROR, res.__("admin.system.something_went_wrong"));
          res.redirect(WEBSITE_ADMIN_URL + "testimonials");
        }
      }
    );
  }; //End updateStatus
}
module.exports = new Testimonial();
