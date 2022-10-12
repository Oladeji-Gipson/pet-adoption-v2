const debug = require('debug')('app:routes:api:pet');
const debugError = require('debug')('app:error');
const express = require('express');
const { nanoid } = require('nanoid');
const dbModule = require('../../database');
const Joi = require('joi');
const validId = require('../../middleware/validId');
const validBody = require('../../middleware/validBody')

const newPetSchema = Joi.object({
  species: Joi.string().trim().min(1).pattern(/^[^0-9]+$/, 'not numbers').required(),
  name: Joi.string().trim().min(1).required(),
  age: Joi.number().integer().min(0).max(1000).required(),
  gender: Joi.string().trim().length(1).required(),
});

const updatePetSchema = Joi.object({
  species: Joi.string().trim().min(1).pattern(/^[^0-9]+$/, 'not numbers').required(),
  name: Joi.string().trim().min(1).required(),
  age: Joi.number().integer().min(0).max(1000).required(),
  gender: Joi.string().trim().length(1).required(),
});

//create a router
const router = express.Router();

//define routes
router.get('/api/pet/list', async (req, res, next) => {
  try {
    let { keywords, species, minAge, maxAge, sortBy, pageNumber, pageSize } = req.query;
    minAge = parseInt(minAge);
    maxAge = parseInt(maxAge);

    //match stage
    const match = {};
    if(keywords) {
      match.$text = { $search: keywords };
    }
    if (species) {
      match.species = { $eq: species };
    }
    if(parseInt(minAge) && parseInt(maxAge)) {
      match.age = { $gte: minAge, $lte: maxAge };
    }
    else if (parseInt(minAge)) {
      match.age = { $gte: minAge };
    }
    else if (parseInt(maxAge)) {
      match.age = { $lte: maxAge };
    }


    //sort stage
    let sort = { name: 1, createdDate: 1 };
    switch (sortBy) {
      case 'species': sort = { species: 1, name: 1, createdDate: 1 }; break;
      case 'species_desc': sort = { species: -1, name: -1, createdDate: -1 }; break;
      case 'name': sort = { name: 1, createdDate: 1 }; break;
      case 'name_desc': sort = { name: -1, createdDate: -1 }; break;
      case 'age': sort = { age: 1, createdDate: 1 }; break;
      case 'age_desc': sort = { age: -1, createdDate: -1 }; break;
      case 'gender': sort = { gender: 1, name: 1, createdDate: 1 }; break;
      case 'gender_desc': sort = { gender: -1, name: -1, createdDate: -1 }; break;
      case 'newest': sort = { createdDate: 1 }; break;
      case 'oldest': sort = { createdDate: -1 }; break;
    }

    //project stage
    const project = { species: 1, name: 1, age: 1, gender: 1 };

    //skip & limit stages
    pageNumber = parseInt(pageNumber) || 1;
    pageSize = parseInt(pageSize) || 5;
    const skip = (pageNumber - 1) * pageSize;
    const limit = pageSize;

    //pipeline
    const pipeline = [
      { $match: match },
      { $sort: sort },
      { $project: project },
      { $skip: skip },
      { $limit: limit },
    ];

    const db = await dbModule.connect();
    const cursor = await db.collection('pets').aggregate(pipeline);
    const results = await cursor.toArray();

    res.json(results)
    debug(results)
  } catch (err) {
    next(err);
  }
});

router.get('/api/pet/:petId', validId('petId'), async (req, res, next) => {
  try {
    const petId = req.petId
    const pet = await dbModule.findPetById(petId);
    if(!pet) {
      res.status(404).json({ error: `${petId} Id Not Found` })
    } else {
      res.json(pet)
    } 
  } catch (err) {
    next(err);
  }
});
//create
router.put('/api/pet/new', validBody(newPetSchema), async (req, res, next) => {
  try {
    const pet = req.body;
    pet._id = dbModule.newId();

    await dbModule.insertOnePet(pet);
    res.json({ message: 'Pet inserted.' })
  } catch (err) {
    next(err)
  }

});
//update
router.put('/api/pet/:petId', validId('petId'), validBody(updatePetSchema), async (req, res, next) => {
  try {
    const petId = req.petId;
    const update = req.body;
    debug(`update pet ${petId}`, update);

    const pet = await dbModule.findPetById(petId);
    if (!pet) {
      res.status(404).json({error: `Pet ${petId} Not Found.`})
    } else {
      await dbModule.updateOnePet(petId, update);
      res.json({message: `Pet ${petId} Updated.`})
    }
  } catch (err) {
    next(err)
  }
});

//delete
router.delete('/api/pet/:petId', async (req, res, next) => {
  try {
    const petId = dbModule.newId(req.params.petId);
    const pet = dbModule.findPetById(petId)
    debug(`delete pet ${petId}`);
  
    if (!pet) {
      res.status(404).json({error: `Pet ${petId} Not Found.`})
    } else {
      await dbModule.deleteOnePet(petId);
      res.json({message: `Pet ${petId} Deleted.`})
    }
  } catch (err) {
    next(err)
  }
});


//export router
module.exports = router;