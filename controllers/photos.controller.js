const Photo = require('../models/photo.model');
const sanitize = require('mongo-sanitize');
const Voter = require('../models/voters.model');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const sanitizedBody = sanitize(req.fields);
    const { title, author, email } = sanitizedBody;
    const file = req.files.file;
    const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
    const fileExt = fileName.split('.').slice(-1)[0];

    if (title && author && email && file) {
      // if fields are not empty...

      if (fileExt !== 'jpg' && fileExt !== 'gif' && fileExt !== 'png') {
        throw new Error('Wrong file type!');
      }

      if (title.length > 25) {
        throw new Error('Title is too long!');
      }
      if (author.length > 50) {
        throw new Error('Author is too long!');
      } else {
        const newPhoto = new Photo({
          title,
          author,
          email,
          src: fileName,
          votes: 0,
        });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      }
    } else {
      throw new Error('Wrong input!');
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if (!photoToUpdate) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const userIP =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const voter = await Voter.findOne({ user: userIP });

    if (!voter) {
      const newVoter = new Voter({ user: userIP, votes: [req.params.id] });
      await newVoter.save();
      photoToUpdate.votes++;
      await photoToUpdate.save();
      res.send({ message: 'OK' });
    } else {
      const hasVoted = voter.votes.includes(req.params.id);
      if (hasVoted) {
        res.status(500).json({ message: 'Already voted for this photo' });
      } else {
        voter.votes.push(req.params.id);
        await voter.save();
        photoToUpdate.votes++;
        await photoToUpdate.save();
        res.send({ message: 'OK' });
      }
    }
  } catch (err) {
    res.status(500).json(err);
  }
};
