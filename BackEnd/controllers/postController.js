import PostModel from '../models/postModel.js';
import { uploadErrors } from '../utils/errors.utils.js';
import mongoose from 'mongoose';
import fs from 'fs';
const { ObjectID } = mongoose.Types.ObjectId;

export function readPost(req, res) {
  PostModel.find((err, docs) => {
    if (!err) res.send(docs);
    else console.log('Error to get data : ' + err);
  }).sort({ createdAt: -1 });
}

export async function createPost(req, res) {
  let fileName;

  if (req.file !== null) {
    try {
      if (
        req.file.detectedMimeType != 'image/jpg' &&
        req.file.detectedMimeType != 'image/png' &&
        req.file.detectedMimeType != 'image/jpeg'
      )
        throw Error('invalid file');

      if (req.file.size > 500000) throw Error('max size');
    } catch (err) {
      const errors = uploadErrors(err);
      return res.status(201).json({ errors });
    }
    fileName = req.body.posterId + Date.now() + '.jpg';

    fs.createReadStream(
      `BackEnd/../../FrontEnd/public/uploads/posts/${req.file.originalName}`,
    ).pipe(
      fs.createWriteStream(
        `BackEnd/../../FrontEnd/public/uploads/posts/${fileName}`,
      ),
    );
  }

  const newPost = new PostModel({
    posterId: req.body.posterId,
    message: req.body.message,
    picture: req.file !== null ? './uploads/posts/' + fileName : '',
    video: req.body.video,
    likers: [],
    comments: [],
  });

  try {
    const post = await newPost.save();
    return res.status(201).json(post);
  } catch (err) {
    return res.status(400).send(err);
  }
}

export function updatePost(req, res) {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send('ID unknown : ' + req.params.id);

  const updatedRecord = {
    message: req.body.message,
  };

  PostModel.findByIdAndUpdate(
    req.params.id,
    { $set: updatedRecord },
    { new: true },
    (err, docs) => {
      if (!err) res.send(docs);
      else console.log('Update error : ' + err);
    },
  );
}

export function deletePost(req, res) {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send('ID unknown : ' + req.params.id);

  PostModel.findByIdAndRemove(req.params.id, (err, docs) => {
    if (!err) res.send(docs);
    else console.log('Delete error : ' + err);
  });
}

export async function likePost(req, res) {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send('ID unknown : ' + req.params.id);

  try {
    await PostModel.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { likers: req.body.id },
      },
      { new: true },
    )
      .then((data) => res.send(data))
      .catch((err) => res.status(500).send({ message: err }));

    await _findByIdAndUpdate(
      req.body.id,
      {
        $addToSet: { likes: req.params.id },
      },
      { new: true },
    )
      .then((data) => res.send(data))
      .catch((err) => res.status(500).send({ message: err }));
  } catch (err) {
    return res.status(400).send(err);
  }
}

export async function unlikePost(req, res) {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send('ID unknown : ' + req.params.id);

  try {
    await PostModel.findByIdAndUpdate(
      req.params.id,
      {
        $pull: { likers: req.body.id },
      },
      { new: true },
    )
      .then((data) => res.send(data))
      .catch((err) => res.status(500).send({ message: err }));

    await PostModel._findByIdAndUpdate(
      req.body.id,
      {
        $pull: { likes: req.params.id },
      },
      { new: true },
    )
      .then((data) => res.send(data))
      .catch((err) => res.status(500).send({ message: err }));
  } catch (err) {
    return res.status(400).send(err);
  }
}

export function commentPost(req, res) {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send('ID unknown : ' + req.params.id);

  try {
    return PostModel.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            commenterId: req.body.commenterId,
            commenterPseudo: req.body.commenterPseudo,
            text: req.body.text,
            timestamp: new Date().getTime(),
          },
        },
      },
      { new: true },
    )
      .then((data) => res.send(data))
      .catch((err) => res.status(500).send({ message: err }));
  } catch (err) {
    return res.status(400).send(err);
  }
}

export function editCommentPost(req, res) {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send('ID unknown : ' + req.params.id);

  try {
    return PostModel.findById(req.params.id, (err, docs) => {
      const theComment = docs.comments.find((comment) =>
        comment._id.equals(req.body.commentId),
      );

      if (!theComment) return res.status(404).send('Comment not found');
      theComment.text = req.body.text;

      return docs.save((err) => {
        if (!err) return res.status(200).send(docs);
        return res.status(500).send(err);
      });
    });
  } catch (err) {
    return res.status(400).send(err);
  }
}

export function deleteCommentPost(req, res) {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send('ID unknown : ' + req.params.id);

  try {
    return PostModel.findByIdAndUpdate(
      req.params.id,
      {
        $pull: {
          comments: {
            _id: req.body.commentId,
          },
        },
      },
      { new: true },
    )
      .then((data) => res.send(data))
      .catch((err) => res.status(500).send({ message: err }));
  } catch (err) {
    return res.status(400).send(err);
  }
}
