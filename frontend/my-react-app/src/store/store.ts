import { configureStore } from "@reduxjs/toolkit";
import { ttsApi } from "../api/ttsApi";

export const store = configureStore({
  reducer: {
    [ttsApi.reducerPath]: ttsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ttsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;