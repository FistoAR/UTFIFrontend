import { configureStore } from '@reduxjs/toolkit';
import exposReducer from './exposSlice';

export const store = configureStore({
  reducer: {
    expos: exposReducer,
  },
});
