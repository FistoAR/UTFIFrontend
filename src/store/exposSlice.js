import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const fetchExpos = createAsyncThunk(
  'expos/fetchExpos',
  async (employeeId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expos`, {
        headers: {
          'ngrok-skip-browser-warning': 'any'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Check if response has success flag and data array
      const data = result.data || result;
      
      if (Array.isArray(data)) {
        return data
          .filter(ex => ex.active !== 0 && ex.active !== '0')
          .map(ex => ({
            id: ex.id,
            name: `${ex.expo_name || ex.name} ${ex.year || ''}`.trim(),
            employees_allocated: typeof ex.employees_allocated === 'string' ? JSON.parse(ex.employees_allocated || "[]") : (ex.employees_allocated || [])
          }))
          // Filter by employee allocation if employeeId is provided
          .filter(expo => {
            // If no employeeId provided (admin), show all expos
            if (!employeeId || employeeId === 'null') return true;
            
            // For employees, check if their ID is in the allocated array
            const allocated = expo.employees_allocated || [];
            return allocated.some(id => parseInt(id) === parseInt(employeeId));
          });
      } else {
        throw new Error('Received non-array data from expos endpoint');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const exposSlice = createSlice({
  name: 'expos',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpos.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchExpos.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchExpos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export default exposSlice.reducer;
