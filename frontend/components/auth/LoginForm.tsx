import React, { useState } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  Link,
  Alert,
  CircularProgress
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onNavigateToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onNavigateToRegister }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: Yup.object({
      username: Yup.string()
        .required('请输入用户名'),
      password: Yup.string()
        .required('请输入密码'),
    }),
    onSubmit: async (values) => {
      setLoading(true);
      setError(null);
      try {
        await onLogin(values.username, values.password);
      } catch (err: any) {
        setError(err?.message || '登录失败，请检查用户名和密码');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
      <Typography variant="h5" component="h1" align="center" gutterBottom>
        登录
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit}>
        <Box mb={2}>
          <TextField
            fullWidth
            id="username"
            name="username"
            label="用户名"
            variant="outlined"
            value={formik.values.username}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.username && Boolean(formik.errors.username)}
            helperText={formik.touched.username && formik.errors.username}
            disabled={loading}
          />
        </Box>

        <Box mb={3}>
          <TextField
            fullWidth
            id="password"
            name="password"
            label="密码"
            type="password"
            variant="outlined"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            disabled={loading}
          />
        </Box>

        <Button
          fullWidth
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : '登录'}
        </Button>

        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            还没有账号？{' '}
            <Link
              component="button"
              variant="body2"
              onClick={onNavigateToRegister}
              underline="hover"
            >
              立即注册
            </Link>
          </Typography>
        </Box>
      </form>
    </Paper>
  );
};

export default LoginForm; 