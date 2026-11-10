const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const { ROLE_IDS, USER_STATUS } = require('../config/constants');

class AdminService {
  async getAuthors() {
    const authors = await userRepository.findAllAuthors();
    return { count: authors.length, authors };
  }

  async approveAuthor(authorId) {
    const author = await userRepository.findById(authorId);
    if (!author || author.role_id !== ROLE_IDS.AUTHOR) {
      const err = new Error('Author account not found');
      err.status = 404;
      throw err;
    }

    const updated = await userRepository.updateAuthorStatus(authorId, USER_STATUS.APPROVED);
    return {
      message: `Author "${author.full_name}" has been approved successfully! They can now manage books.`,
      author: updated
    };
  }

  async rejectAuthor(authorId) {
    const author = await userRepository.findById(authorId);
    if (!author || author.role_id !== ROLE_IDS.AUTHOR) {
      const err = new Error('Author account not found');
      err.status = 404;
      throw err;
    }

    const updated = await userRepository.updateAuthorStatus(authorId, USER_STATUS.REJECTED);
    return {
      message: `Author application for "${author.full_name}" has been rejected.`,
      author: updated
    };
  }

  async createAuthor({ full_name, email, password, bio }) {
    if (!full_name || !email || !password) {
      const err = new Error('Full name, email, and password are required');
      err.status = 400;
      throw err;
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const createdAuthor = await userRepository.createUser({
      full_name,
      email,
      password_hash,
      role_id: ROLE_IDS.AUTHOR,
      status: USER_STATUS.APPROVED,
      bio
    });

    return {
      message: `Author "${full_name}" created and verified successfully by Super Admin`,
      author: createdAuthor
    };
  }

  async updateAuthor(authorId, updateData) {
    const author = await userRepository.findById(authorId);
    if (!author || author.role_id !== ROLE_IDS.AUTHOR) {
      const err = new Error('Author not found');
      err.status = 404;
      throw err;
    }

    const updated = await userRepository.updateAuthorProfile(authorId, updateData);
    return { message: 'Author updated successfully', author: updated };
  }

  async removeAuthor(authorId) {
    const author = await userRepository.findById(authorId);
    if (!author || author.role_id !== ROLE_IDS.AUTHOR) {
      const err = new Error('Author not found');
      err.status = 404;
      throw err;
    }

    await userRepository.deleteAuthor(authorId);
    return { message: `Author "${author.full_name}" removed from platform.` };
  }
}

module.exports = new AdminService();
